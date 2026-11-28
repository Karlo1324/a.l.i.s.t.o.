import { useContext, useState } from 'react'
import { Alert, Image, Pressable, ScrollView, Share, Text, useWindowDimensions, View } from 'react-native'
import { categories, icons, statuses } from './presentation'
import { Icon } from './ResidentControls'
import { Button, Card, Field, Label, Theme } from './ui'
import { IncidentMap } from './IncidentMap'
import type { Report } from './backend'

export type LocalUpdate = {body:string;at:number}
export function ReportDetail({report,photos,updates,onUpdate,openMap,back}:{report:Report;photos:string[];updates:LocalUpdate[];onUpdate:(body:string)=>void;openMap:()=>void;back:()=>void}){
 const c=useContext(Theme),{width}=useWindowDimensions()
 const [editing,edit]=useState(false),[note,write]=useState('')
 const category=categories.find(v=>v.key===report.category)??categories[6]
 const key=report.status.toLowerCase().replace('under_review','review').replace('in_progress','progress')
 const status=statuses.find(v=>v.key===key),idx=statuses.findIndex(v=>v.key===key)
 return <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{paddingBottom:30}}>
 <View style={{height:260,alignItems:'center',justifyContent:'center',backgroundColor:category.color+'22'}}>
 {photos.length?<ScrollView horizontal pagingEnabled>{photos.map(uri=><Image key={uri} source={{uri}} style={{width,height:260}}/>)}</ScrollView>:<Icon source={category.icon} color={category.color} size={88}/>}
 <View style={{position:'absolute',top:12,left:16,right:16,flexDirection:'row',justifyContent:'space-between'}}>
 <Pressable accessibilityLabel="Back" onPress={back} style={{padding:10,borderRadius:28,backgroundColor:c.card}}><Icon source={icons.ChevronLeft} color={c.ink}/></Pressable>
 <Button secondary label="Share" onPress={()=>Share.share({message:report.title+' · '+report.code}).catch(e=>Alert.alert('Share',e.message))}/></View></View>
 <View style={{marginTop:-24,borderTopLeftRadius:28,borderTopRightRadius:28,backgroundColor:c.bg,padding:18,gap:14}}>
 <Text style={{fontSize:13,color:category.color,fontWeight:'600'}}>{category.label}</Text><Label muted>{report.code}</Label><Label large>{report.title}</Label><Label muted>{report.landmark||report.lat.toFixed(5)+', '+report.lng.toFixed(5)}</Label>
 <Card><Text style={{color:status?.color??c.ink,fontWeight:'700'}}>{status?.label??report.status}</Text>
 {key==='rejected'?<Label muted>This report could not be validated by the barangay.</Label>:<View style={{flexDirection:'row'}}>{statuses.slice(0,6).map((v,i)=><View key={v.key} style={{flex:1,alignItems:'center',gap:5}}>
 <View style={{width:20,height:20,borderRadius:10,alignItems:'center',justifyContent:'center',backgroundColor:i<=idx?status?.color:c.field}}>{i<idx&&<Icon source={icons.Check} color="white" size={12}/>}</View>
 <Text style={{color:c.muted,fontSize:10,textAlign:'center'}}>{v.label}</Text></View>)}</View>}</Card>
 <Label large>Activity</Label>{updates.map((u,i)=><Card key={i}><Label>{u.body}</Label><Label muted>{new Date(u.at).toLocaleString()} · Local update</Label></Card>)}
 <Card><Label>Pending</Label><Label muted>Submitted for verification · {new Date(report.createdAt).toLocaleString()}</Label></Card>
 <Card><Label muted>DESCRIPTION</Label><Label>{report.description}</Label><Label muted>{report.danger?'People in danger · ':''}{report.affected} affected</Label></Card>
 <Card><IncidentMap height={160} controls={false} reports={[report]}/><Label>{report.landmark}</Label><Label muted>{report.lat.toFixed(5)}, {report.lng.toFixed(5)}</Label><Button secondary label="Open map" onPress={openMap}/></Card>
 {!['resolved','rejected'].includes(key)&&(editing?<Card><Field label="Add information" multiline value={note} onChangeText={write}/><Button disabled={note.trim().length<3} label="Send update" onPress={()=>{onUpdate(note.trim());edit(false);write('');Alert.alert('Information added to the local report')}}/><Button secondary label="Cancel" onPress={()=>edit(false)}/></Card>:<Button secondary label="Add more information" onPress={()=>edit(true)}/>)}
 </View></ScrollView>
}
