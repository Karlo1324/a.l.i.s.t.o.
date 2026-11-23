import { useCallback, useEffect, useRef, useState } from 'react'
import {
  ActivityIndicator, Alert, BackHandler, Image, Pressable, ScrollView,
  StatusBar, StyleSheet, Text, TextInput, View,
} from 'react-native'
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context'
import { SQLiteProvider, useSQLiteContext } from 'expo-sqlite'
import * as ImagePicker from 'expo-image-picker'
import * as Location from 'expo-location'
import { categories, initialize, listDrafts, saveDraft, type Draft } from './drafts'

function Action({ label, onPress, disabled = false }: {
  label: string; onPress: () => void; disabled?: boolean
}) {
  return <Pressable accessibilityRole="button" accessibilityState={{ disabled }}
    disabled={disabled} onPress={onPress} style={[s.button, disabled && s.disabled]}>
    <Text style={s.buttonText}>{label}</Text>
  </Pressable>
}

function ReportForm({ onSaved, onBusy }: { onSaved: () => void; onBusy: (busy: boolean) => void }) {
  const db = useSQLiteContext()
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState('')
  const [place, setPlace] = useState('')
  const [photo, setPhoto] = useState<string | null>(null)
  const [working, setWorking] = useState(false)
  const lock = useRef(false)

  async function run(task: () => Promise<void>) {
    if (lock.current) return
    lock.current = true
    setWorking(true)
    onBusy(true)
    try {
      await task()
    } catch {
      Alert.alert('Could not complete action', 'Please try again. You can also enter a location manually.')
    } finally {
      lock.current = false
      setWorking(false)
      onBusy(false)
    }
  }

  async function pickPhoto() {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'], base64: true, quality: 0.5,
    })
    if (result.canceled) return
    const data = result.assets[0]?.base64
    if (!data || data.length > 6_000_000) {
      Alert.alert('Choose a smaller image', 'This photo could not be stored in the draft.')
      return
    }
    setPhoto('data:image/jpeg;base64,' + data)
  }

  async function locate() {
    const permission = await Location.requestForegroundPermissionsAsync()
    if (!permission.granted) {
      Alert.alert('Enter a location', 'Type a street or landmark in the location field.')
      return
    }
    const { coords } = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced })
    setPlace(coords.latitude.toFixed(6) + ', ' + coords.longitude.toFixed(6))
  }

  const valid = title.trim().length >= 5 && description.trim().length >= 10 && category && place.trim()
  return <>
    <Text style={s.heading}>New report draft</Text>
    <Text>Category</Text>
    <View style={s.choices}>{categories.map(item =>
      <Pressable key={item} accessibilityRole="radio" accessibilityState={{ checked: item === category }}
        onPress={() => setCategory(item)} style={[s.chip, item === category && s.selected]}>
        <Text>{item}</Text>
      </Pressable>
    )}</View>
    <Text>Title · 5 characters minimum</Text>
    <TextInput accessibilityLabel="Report title" style={s.input} maxLength={150} value={title} onChangeText={setTitle} />
    <Text>Description · 10 characters minimum</Text>
    <TextInput accessibilityLabel="Report description" style={[s.input, s.multiline]} multiline
      maxLength={5000} value={description} onChangeText={setDescription} />
    <Text>Location</Text>
    <TextInput accessibilityLabel="Location" style={s.input} placeholder="Street or landmark" value={place} onChangeText={setPlace} />
    <Action label="Use device location" disabled={working} onPress={() => run(locate)} />
    {photo && <Image accessibilityLabel="Selected photo" source={{ uri: photo }} style={s.photo} />}
    <Action label={photo ? 'Change photo' : 'Attach a photo (optional)'} disabled={working} onPress={() => run(pickPhoto)} />
    <Action label="Save draft on device" disabled={working || !valid} onPress={() => run(async () => {
      await saveDraft(db, { category, title, description, place, photo })
      onSaved()
    })} />
  </>
}

function Resident() {
  const db = useSQLiteContext()
  const [screen, setScreen] = useState<'home' | 'form' | 'detail'>('home')
  const [rows, setRows] = useState<Awaited<ReturnType<typeof listDrafts>>>([])
  const [detail, setDetail] = useState<Draft | null>(null)
  const [loading, setLoading] = useState(true)
  const [failed, setFailed] = useState(false)
  const [refresh, setRefresh] = useState(0)
  const [busy, setBusy] = useState(false)
  const back = useCallback(() => {
    if (screen === 'home') return false
    if (busy) return true
    if (screen === 'form') {
      Alert.alert('Discard this draft?', 'Your edits have not been saved.', [
        { text: 'Keep editing', style: 'cancel' },
        { text: 'Discard', style: 'destructive', onPress: () => setScreen('home') },
      ])
    } else setScreen('home')
    return true
  }, [screen, busy])
  useEffect(() => {
    const event = BackHandler.addEventListener('hardwareBackPress', back)
    return () => event.remove()
  }, [back])
  useEffect(() => {
    if (screen !== 'home') return
    let active = true
    setLoading(true)
    setFailed(false)
    listDrafts(db).then(items => { if (active) setRows(items) })
      .catch(() => { if (active) setFailed(true) })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [db, screen, refresh])

  async function openDraft(id: number) {
    try {
      const draft = await db.getFirstAsync<Draft>('SELECT * FROM drafts WHERE id = ?', id)
      if (draft) { setDetail(draft); setScreen('detail') }
    } catch { Alert.alert('Could not open draft', 'Try opening it again.') }
  }
  return <SafeAreaView style={s.page}>
    <StatusBar barStyle="dark-content" />
    <ScrollView key={screen} keyboardShouldPersistTaps="handled" contentContainerStyle={s.content}>
      <Text style={s.brand}>A.L.I.S.T.O. Resident</Text>
      {screen !== 'home' && <Action label="Back" disabled={busy} onPress={back} />}
      {screen === 'home' && <>
        <Text style={s.heading}>My reports</Text>
        <Text>Drafts are saved on this device. They have not been sent to barangay staff.</Text>
        <Action label="Create report draft" onPress={() => setScreen('form')} />
        {loading ? <ActivityIndicator /> : failed ? <Action label="Retry loading drafts" onPress={() => setRefresh(n => n + 1)} /> :
          rows.length === 0 ? <Text>No saved drafts yet.</Text> :
          rows.map(row => <Pressable key={row.id} accessibilityRole="button" style={s.card} onPress={() => openDraft(row.id)}>
            <Text style={s.title}>{row.title}</Text><Text>{row.category} · Draft</Text>
          </Pressable>)}
      </>}
      {screen === 'form' && <ReportForm onBusy={setBusy} onSaved={() => setScreen('home')} />}
      {screen === 'detail' && detail && <>
        <Text style={s.heading}>{detail.title}</Text><Text>{detail.category} · Draft</Text>
        <Text>{detail.description}</Text><Text>Location: {detail.place}</Text>
        {detail.photo && <Image accessibilityLabel="Report photo" style={s.photo} source={{ uri: detail.photo }} />}
      </>}
    </ScrollView>
  </SafeAreaView>
}

export default function App() {
  return <SafeAreaProvider><SQLiteProvider databaseName="resident-drafts.db" onInit={initialize}>
    <Resident />
  </SQLiteProvider></SafeAreaProvider>
}

const s = StyleSheet.create({
  page: { flex: 1, backgroundColor: '#f8fafc' },
  content: { padding: 20, gap: 14, paddingBottom: 44 },
  brand: { color: '#334155', fontSize: 15, fontWeight: '700' },
  heading: { fontSize: 29, fontWeight: '700', color: '#17263d' },
  title: { fontSize: 17, fontWeight: '600' },
  card: { backgroundColor: '#ffffff', borderRadius: 12, padding: 16, gap: 6 },
  input: { borderWidth: 1, borderColor: '#94a3b8', borderRadius: 9, padding: 12, color: '#17263d', backgroundColor: 'white' },
  multiline: { minHeight: 86, textAlignVertical: 'top' },
  choices: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { padding: 12, borderColor: '#94a3b8', borderWidth: 1, borderRadius: 10 },
  selected: { backgroundColor: '#dbeafe', borderColor: '#1d4ed8' },
  button: { backgroundColor: '#2148ad', borderRadius: 10, padding: 13, alignItems: 'center' },
  disabled: { opacity: 0.5 },
  buttonText: { color: 'white', fontWeight: '600', fontSize: 16 },
  photo: { width: '100%', height: 200, borderRadius: 12 },
})
