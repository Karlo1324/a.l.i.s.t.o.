import { useContext, useState } from 'react'
import { Alert, Linking, Modal, Pressable, ScrollView, Text, View } from 'react-native'
import { IncidentMap } from './IncidentMap'
import { categories } from './presentation'
import { Button, Card, Field, Label, Theme } from './ui'
import type { Report } from './backend'

export function MapExplorer({reports,open}:{reports:Report[];open:(r:Report)=>void}){
 const c=useContext(Theme)
 const [height,resize]=useState(540),[query,search]=useState(''),[selected,select]=useState<Report>()
 const [filtered,filter]=useState<string[]>([]),[heat,setHeat]=useState(false),[resolved,showResolved]=useState(false)
 const [sheet,setSheet]=useState<'Map layers'|'Incidents'|null>(null),[confirmed,confirm]=useState<string[]>([])
 const visible=reports.filter(r=>r.status.toLowerCase()!=='rejected'&&(resolved||r.status.toLowerCase()!=='resolved')
 &&(!filtered.length||filtered.includes(r.category))&&(r.title+' '+r.landmark).toLowerCase().includes(query.toLowerCase()))
 return <View style={{flex:1}} onLayout={e=>resize(e.nativeEvent.layout.height)}>
 <IncidentMap height={height} reports={visible} heat={heat} onSelect={select} full/>
 <View pointerEvents="box-none" style={{position:'absolute',top:10,left:12,right:12,gap:8}}>
 <View style={{flexDirection:'row',alignItems:'flex-end',gap:8}}><View style={{flex:1}}><Field label="Search incidents or streets" hideLabel placeholder="Search incidents or streets" value={query} onChangeText={q=>{search(q);select(undefined)}}/></View><Button secondary label="Layers" onPress={()=>setSheet('Map layers')}/></View>
 <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{gap:6}}>{categories.map(item=><Button key={item.key} secondary={!filtered.includes(item.key)} label={item.label} onPress={()=>{filter(filtered.includes(item.key)?filtered.filter(k=>k!==item.key):[...filtered,item.key]);select(undefined)}}/>)}</ScrollView></View>
 <View style={{position:'absolute',bottom:10,left:14,right:14}}>{selected?<Card>
 <Pressable accessibilityLabel="Close" onPress={()=>select(undefined)}><Text style={{textAlign:'right',color:c.muted}}>✕</Text></Pressable>
 <Label>{selected.title}</Label><Label muted>{selected.status.replace(/_/g,' ')}</Label><View style={{flexDirection:'row',gap:5}}>
 <Button secondary label={confirmed.includes(selected.id)?'Confirmed':'Me too'} disabled={confirmed.includes(selected.id)} onPress={()=>confirm([...confirmed,selected.id])}/>
 <Button secondary label="Directions" onPress={()=>Linking.openURL('https://www.google.com/maps/dir/?api=1&destination='+selected.lat+','+selected.lng).catch(e=>Alert.alert('Directions',e.message))}/>
 <Button label="Details" onPress={()=>open(selected)}/></View></Card>:<Button secondary label={visible.length+' incidents in view'} onPress={()=>setSheet('Incidents')}/>}</View>
 <Modal visible={!!sheet} transparent onRequestClose={()=>setSheet(null)} animationType="slide"><View style={{flex:1,justifyContent:'flex-end',backgroundColor:'#0006'}}><View style={{maxHeight:'75%',padding:20,gap:10,borderTopLeftRadius:22,borderTopRightRadius:22,backgroundColor:c.card}}>
 <Label large>{sheet}</Label>{sheet==='Map layers'?<><Button secondary label={'Incident heatmap · '+(heat?'On':'Off')} onPress={()=>setHeat(!heat)}/><Button secondary label={'Show resolved incidents · '+(resolved?'On':'Off')} onPress={()=>{showResolved(!resolved);select(undefined)}}/></>:<ScrollView>{visible.map(r=><Button key={r.id} secondary label={r.title} onPress={()=>{select(r);setSheet(null)}}/>)}</ScrollView>}
 <Button label="Done" onPress={()=>setSheet(null)}/></View></View></Modal></View>
}
