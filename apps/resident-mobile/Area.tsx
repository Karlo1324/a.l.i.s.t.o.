import {useEffect,useState} from 'react'
import {Alert,ScrollView} from 'react-native'
import {rpc,type Session} from './backend'
import {Button,Field,Label} from './ui'
import {getPsgcRegions,getPsgcProvinces,getPsgcCities,getPsgcBarangays,type PsgcEntry} from './psgc'
export function Area({current}:{current:()=>Promise<Session>}){
 const [area,setArea]=useState<{barangay_name?:string;pending?:{barangay_name:string}}|null>(null)
 const [region,R]=useState<PsgcEntry>(),[province,P]=useState<PsgcEntry>(),[city,C]=useState<PsgcEntry>(),[village,V]=useState<PsgcEntry>()
 const [stage,S]=useState(0),[choices,choicesTo]=useState<PsgcEntry[]>([]),[query,Q]=useState(''),[error,E]=useState(''),[revision,reload]=useState(0),[busy,B]=useState(false)
 useEffect(()=>{let active=true;E('');choicesTo([]);Q('')
 async function load(){const value=await rpc<NonNullable<typeof area>>(await current(),'my_profile_area')
 if(!active)return;setArea(value)
 if(value?.barangay_name)return
 const list=stage===0?await getPsgcRegions():stage===1?await getPsgcProvinces(region!.code):stage===2?await getPsgcCities(region!.code,province?.code):stage===3?await getPsgcBarangays(city!.code):[]
 if(active){if(stage===1&&!list.length)S(2);else choicesTo(list)}}
 load().catch(e=>{if(active)E(e.message)});return()=>{active=false}
 },[stage,revision,current,region,province,city])
 return <><Label large>Reporting barangay</Label>{error&&<Label>{error}</Label>}{area?.barangay_name?<Label>Assigned to {area.barangay_name}</Label>:<>
 {area?.pending&&<Label>Pending approval · {area.pending.barangay_name}</Label>}<Label>{[region,province,city,village].filter(Boolean).map(v=>v!.name).join(' · ')}</Label>
 {stage<4?<><Field label={['Region','Province','City or municipality','Barangay'][stage]} placeholder="Search" value={query} onChangeText={Q}/>
 <ScrollView nestedScrollEnabled style={{maxHeight:320}}>{choices.filter(v=>v.name.toLowerCase().includes(query.toLowerCase())).map(v=><Button secondary key={v.code} label={v.name} onPress={()=>{[R,P,C,V][stage](v);S(stage+1)}}/>)}</ScrollView></>:
 <Button label="Request barangay assignment" disabled={busy} onPress={async()=>{B(true);try{await rpc(await current(),'request_my_profile_area',{selected_psgc_code:village!.code,selected_barangay_name:village!.name,selected_municipality:city!.name,selected_province:province?.name||(region!.code==='130000000'?'Metro Manila':region!.name),selected_region:region!.name});Alert.alert('Request sent');S(0);R(undefined);P(undefined);C(undefined);V(undefined)}catch(e){E(String(e))}finally{B(false)}}}/>}
 {stage>0&&<Button secondary label="Start selection again" onPress={()=>{R(undefined);P(undefined);C(undefined);V(undefined);S(0)}}/>}</>}
 <Button secondary label="Refresh" onPress={()=>reload(v=>v+1)}/></>
}
