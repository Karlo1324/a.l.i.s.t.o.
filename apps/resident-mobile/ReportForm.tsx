import {useState,useRef,useContext,useEffect} from 'react'
import {Alert,BackHandler,Image,Linking,Pressable,ScrollView,Text,View,Switch} from 'react-native'
import {useSQLiteContext} from 'expo-sqlite'
import * as Picker from 'expo-image-picker'
import * as Location from 'expo-location'
import {storeSubmission,type Draft,type Submission} from './drafts'
import {send,type Session} from './backend'
import {Button,Card,Field,Label,Theme} from './ui'
import {IncidentMap} from './IncidentMap'
import {Icon} from './ResidentControls'
import {categories,icons} from './presentation'
const suggestions: Record<string,string[]> = {
  flooding: ['Street flooding', 'Clogged drainage', 'Water entering homes'],
  road: ['Pothole', 'Road crack', 'Sinkhole'],
  building: ['Collapsed wall', 'Roof damage', 'Structural crack'],
  tree: ['Fallen tree blocking road', 'Branch on power line', 'Leaning tree'],
  landslide: ['Soil erosion', 'Rockfall', 'Slope crack'],
  electrical: ['Downed power line', 'Sparking post', 'Exposed wiring'],
  other: ['Broken streetlight', 'Missing drainage cover', 'Damaged footbridge'],
}
export type SavedDraft=Draft & {options:Submission|null;locked?:number}
export function ReportForm({account,current,onSaved,initial,setBusy,onCancel,onTrack}:{onCancel:()=>void;onTrack:(reference:string)=>void;account:Session|null;current:()=>Promise<Session>;onSaved:(ref?:string)=>void;initial?:SavedDraft;setBusy:(v:boolean)=>void}){
 const [step,setStep]=useState(initial?.locked ? 4 : 0),[category,categoryTo]=useState(initial?.category||''),[title,titleTo]=useState(initial?.title||''),[description,describe]=useState(initial?.description||'')
 const [landmark,place]=useState(initial?.place||''),[coords,locate]=useState(initial?.options?.coordinates||''),[gps,gpsTo]=useState(initial?.options?.gps||false)
 const [affected,affect]=useState(String(initial?.options?.affected??0)),[danger,threat]=useState(initial?.options?.danger||false),[anonymous,hide]=useState(initial?.options?.anonymous||false)
 const [photos,setPhotos]=useState<string[]>(initial?.photos||[]),[working,work]=useState(false)
 const saved=useRef<number|null>(initial?.locked ? initial.id : null),lock=useRef(false),db=useSQLiteContext()
 const [lat,lng]=coords.split(',').map(Number)
 const validCoords=/^\s*-?\d+(\.\d+)?\s*,\s*-?\d+(\.\d+)?\s*$/.test(coords)&&Math.abs(lat)<=90&&Math.abs(lng)<=180
 const valid=[!!category,title.trim().length>=5&&description.trim().length>=10&&affected!=='',true,validCoords,true][step]
 const c=useContext(Theme)
 const [receipt,setReceipt]=useState<{reference?:string}|null>(null)
 const scroll=useRef<ScrollView>(null)
 const steps=['Category','Details','Photos','Location','Review']
 const item=categories.find(v=>v.label===category)
 function close(){
   if(working)return
   if(receipt||(!category&&!title))return onCancel()
   Alert.alert('Discard this report?','Your details and photos will not be saved.',[{text:'Keep editing',style:'cancel'},{text:'Discard',style:'destructive',onPress:onCancel}])
 }
 function back(){if(working)return;if(!receipt&&step>0&&!saved.current)setStep(step-1);else close()}
 useEffect(()=>{scroll.current?.scrollTo({y:0,animated:false})},[step,receipt])
 useEffect(()=>{const sub=BackHandler.addEventListener('hardwareBackPress',()=>{back();return true});return()=>sub.remove()})
 async function run(task:()=>Promise<void>){
 if(lock.current)return
 lock.current=true;work(true);setBusy(true)
 try{await task()}catch(e){Alert.alert('Report',e instanceof Error?e.message:'Please retry.')}finally{lock.current=false;work(false);setBusy(false)}
 }
 async function attach(){
 const result=await Picker.launchImageLibraryAsync({mediaTypes:['images'],base64:true,quality:.5})
 if(result.canceled)return
 const data=result.assets[0]?.base64
 if(!data||data.length*3/4>=5000000)throw Error('Please choose a smaller photo. The compressed file must be under 5 MB.')
 setPhotos([...photos,'data:image/jpeg;base64,'+data])
 }
 async function submit(){
 const options={coordinates:coords,gps,affected:Number(affected),danger,anonymous}
 const draft={category,title,description,place:landmark,photos,photo:photos[0]||null}
 const session=account?await current():null
 if(!saved.current)saved.current=await storeSubmission(db,draft,session?.uid||null,options,initial?.id)
 if(!session){setReceipt({});return}
 const reference=await send(db,{...draft,id:saved.current},session,coords,gps,Number(affected),danger,anonymous)
 setReceipt({reference})
 }
 if(receipt)return <View style={{flex:1,justifyContent:'center',padding:24,gap:18}}>
 <View style={{alignSelf:'center',width:96,height:96,borderRadius:48,backgroundColor:'#22a06b',alignItems:'center',justifyContent:'center'}}><Icon source={icons.Check} color="white" size={48}/></View>
 <Label large>{receipt.reference?'Report submitted':'Report added locally'}</Label>
 <Label muted>{receipt.reference?'Your report is pending barangay verification.':'Your guest report is stored on this device.'}</Label>
 <Card><Label>{title}</Label><Label muted>{landmark||coords}</Label>{receipt.reference&&<Label>Reference no. · {receipt.reference}</Label>}</Card>
 {receipt.reference&&<Button label="Track this report" onPress={()=>onTrack(receipt.reference!)}/>}<Button secondary label="Done" onPress={()=>onSaved(receipt.reference)}/></View>
 return <View style={{flex:1}}>
 <View style={{paddingHorizontal:16,gap:8,paddingBottom:10}}>
 <View style={{height:44,flexDirection:'row',alignItems:'center',justifyContent:'space-between'}}>
 <Pressable accessibilityRole="button" accessibilityLabel="Back" disabled={working} onPress={back}><Text style={{color:c.accent,fontSize:20}}>{step?'‹ Back':'×'}</Text></Pressable>
 <Text style={{color:c.ink,fontWeight:'600',fontSize:17}}>New report</Text><Pressable disabled={working} onPress={close}><Text style={{color:c.muted,fontSize:17}}>Cancel</Text></Pressable></View>
 <Pressable accessibilityRole="button" onPress={()=>Alert.alert('Digos Police','0939 924 0779',[{text:'Cancel',style:'cancel'},{text:'Call',onPress:()=>Linking.openURL('tel:09399240779')}])} style={{backgroundColor:c.bg==='#060d1f'?'#302032':'#fdecea',padding:13,borderRadius:18,flexDirection:'row',alignItems:'center',gap:10}}>
 <Text style={{flex:1,color:c.ink,fontSize:13}}><Text style={{fontWeight:'bold'}}>Life-threatening emergency?</Text> Contact your local emergency service first.</Text>
 <Text style={{color:'#d53930',fontWeight:'600'}}>Call</Text></Pressable>
 <View style={{flexDirection:'row',gap:6}}>{steps.map((name,i)=><View key={name} style={{height:4,flex:1,borderRadius:2,backgroundColor:i<=step?c.accent:c.line}}/>)}</View>
 <Text style={{fontSize:13,color:c.muted}}>Step {step+1} of 5 · {steps[step]}{account?' · '+account.name:''}</Text></View>
 <ScrollView ref={scroll} keyboardShouldPersistTaps="handled" contentContainerStyle={{padding:20,gap:12}}>
 {step===0&&<><Label large>What happened?</Label><Label muted>Choose the category that best describes the incident.</Label>
 <View style={{flexDirection:'row',flexWrap:'wrap',justifyContent:'space-between',rowGap:12}}>
 {categories.map(v=>{const selected=category===v.label;return <Pressable key={v.key} accessibilityRole="radio" accessibilityState={{checked:selected}} onPress={()=>categoryTo(v.label)}
 style={{width:v.key==='other'?'100%':'48%',padding:16,borderRadius:22,backgroundColor:c.card,borderWidth:selected?2:1,borderColor:selected?v.color:c.line,gap:6}}>
 <View style={{width:44,height:44,borderRadius:15,alignItems:'center',justifyContent:'center',backgroundColor:selected?v.color:v.color+'22'}}><Icon source={v.icon} color={selected?'white':v.color}/></View>
 <Text style={{color:c.ink,fontSize:15,fontWeight:'600'}}>{v.label}</Text><Text style={{color:c.muted,fontSize:12}}>{v.description}</Text>
 {selected&&<View style={{position:'absolute',right:12,top:12,backgroundColor:v.color,borderRadius:12,padding:4}}><Icon source={icons.Check} color="white" size={14}/></View>}</Pressable>})}</View></>}
 {step===1&&<><Label muted>{category}</Label><Label large>Tell us more</Label><Field label="Short title" placeholder="e.g. Street flooding near covered court" value={title} onChangeText={titleTo} maxLength={60}/>
 <Label muted>Use at least 5 characters.</Label><ScrollView horizontal contentContainerStyle={{gap:6}}>{(suggestions[item?.key||'other']||[]).map(v=><Button key={v} secondary label={v} onPress={()=>titleTo(v)}/>)}</ScrollView>
 <Field label={'Description · '+description.length+'/500'} placeholder="What do you see? How big is the area? Is it getting worse? (English or Filipino)" value={description} onChangeText={describe} multiline maxLength={500}/>
 <Label muted>Use at least 10 characters.</Label><Card><Label>Is anyone in immediate danger?</Label><Switch value={danger} onValueChange={threat}/>
 <Field label="People affected" keyboardType="number-pad" maxLength={7} value={affected} onChangeText={v=>affect(v.replace(/[^0-9]/g,''))}/><View style={{flexDirection:'row',gap:8}}><Button secondary label="−" onPress={()=>affect(String(Math.max(0,Number(affected)-5)))}/><Button secondary label="+" onPress={()=>affect(String(Math.min(9999999,Number(affected)+5)))}/></View></Card></>}
 {step===2&&<><Label large>Add photos</Label><Label muted>Add up to six photos. Larger photos are compressed to under 5 MB each.</Label>
 <View style={{flexDirection:'row',flexWrap:'wrap',gap:'2%'}}>{photos.map((uri,i)=><View key={i} style={{width:'32%',aspectRatio:1,borderRadius:18,overflow:'hidden'}}><Image source={{uri}} style={{width:'100%',height:'100%'}}/>{!i&&<Text style={{position:'absolute',bottom:5,left:5,backgroundColor:'#0009',color:'white'}}> Cover </Text>}<Pressable accessibilityLabel="Remove photo" onPress={()=>setPhotos(photos.filter((_,j)=>j!==i))} style={{position:'absolute',right:4,top:4,backgroundColor:'#0009',borderRadius:12,paddingHorizontal:7}}><Text style={{color:'white'}}>×</Text></Pressable></View>)}
 {photos.length<6&&Array.from({length:Math.max(1,3-photos.length)},(_,i)=><Pressable key={'add'+i} disabled={working} onPress={()=>run(attach)} style={{width:'32%',aspectRatio:1,borderStyle:'dashed',borderWidth:1,borderColor:c.muted,borderRadius:18,alignItems:'center',justifyContent:'center'}}><Icon source={icons.Plus} color={c.muted}/><Text style={{color:c.muted}}>Add photo</Text></Pressable>)}</View></>}
 {step===3&&<><Field label="Street or landmark" value={landmark} onChangeText={place}/><Field label="Latitude, longitude" value={coords} onChangeText={v=>{locate(v);gpsTo(false)}}/>
 <Button label="Use current location" disabled={working} onPress={()=>run(async()=>{if(!(await Location.requestForegroundPermissionsAsync()).granted)throw Error('Select the incident on the map or enter its coordinates.')
 const {coords:c}=await Location.getCurrentPositionAsync({accuracy:Location.Accuracy.Balanced});locate(c.latitude+', '+c.longitude);gpsTo(true)})}/>
 <IncidentMap key={gps?coords:'manual'} initial={validCoords?{lat,lng}:undefined} onPick={p=>{gpsTo(false);locate(p.lat.toFixed(6)+', '+p.lng.toFixed(6))}}/></>}
 {step===4&&<><Label large>Review &amp; submit</Label><Label muted>Make sure everything looks right.</Label><Card>
 {photos.length>0&&<ScrollView horizontal>{photos.map((uri,i)=><Image key={i} source={{uri}} style={{width:200,height:144}}/>)}</ScrollView>}
 {[category,title+'\n'+description+'\n'+affected+' affected',photos.length?photos.length+' attached':'No photos',landmark+' '+coords].map((v,i)=><View key={i} style={{gap:5}}>
 <View style={{flexDirection:'row',justifyContent:'space-between'}}><Label muted>{steps[i]}</Label><Pressable disabled={!!saved.current} onPress={()=>setStep(i)}><Text style={{color:c.accent}}>Edit</Text></Pressable></View><Label>{v}</Label></View>)}</Card>
 <Card><Label>Hide my name publicly</Label><Label muted>Officials can still see your contact info</Label><Switch disabled={saved.current!==null} value={anonymous} onValueChange={hide}/></Card>
 <Label muted>By submitting, you confirm this report is accurate.</Label></>}
 </ScrollView>
 <View style={{padding:16,backgroundColor:c.card,borderTopWidth:1,borderColor:c.line}}>
 <Button disabled={!valid||working} danger={step===4&&!!account} label={working?'Please wait…':step===2&&!photos.length?'Skip for now':step===3?'Confirm location':step<4?'Continue':account?'Submit report to officials':'Save local guest draft'} onPress={()=>step<4?setStep(step+1):run(submit)}/></View></View>
}
