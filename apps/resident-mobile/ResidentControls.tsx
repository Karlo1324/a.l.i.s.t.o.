import { useContext } from 'react'
import { Image, Pressable, Text, View } from 'react-native'
import { categories, icons, statuses } from './presentation'
import { Theme } from './ui'
import type { Report } from './backend'

export const sections = ['Home', 'Map', 'Reports', 'Profile'] as const
const tabIcons = [icons.House, icons.Map, icons.ClipboardList, icons.UserRound]
export function Icon({ source, color, size = 22 }: { source: number; color: string; size?: number }) {
  return <Image accessible={false} source={source} style={{ width: size, height: size, tintColor: color }} />
}
export function ResidentTabs({ page, select }: { page: string; select: (page: typeof sections[number] | 'New report') => void }) {
  const c = useContext(Theme)
  return <View style={{ flexDirection: 'row', gap: 12, paddingHorizontal: 16, paddingBottom: 16, paddingTop: 6 }}>
    <View style={{ flex: 1, flexDirection: 'row', padding: 6, borderRadius: 36, backgroundColor: c.card, elevation: 4 }}>
      {sections.map((item, i) => {
        const selected = page === item
        const color = selected ? c.accent : c.muted
        return <Pressable key={item} accessibilityRole="tab" accessibilityState={{ selected }} onPress={() => select(item)}
          style={{flex:1,alignItems:'center',justifyContent:'center',gap:2,borderRadius:30,backgroundColor:selected?c.soft:'transparent'}}>
          <Icon source={tabIcons[i]} color={color}/><Text style={{fontSize:10,fontWeight:'600',color}}>{item}</Text>
        </Pressable>
      })}
    </View>
    <Pressable accessibilityRole="button" accessibilityLabel="Report incident" onPress={() => select('New report')}
      style={{height:64,width:64,borderRadius:32,backgroundColor:'#e5372a',alignItems:'center',justifyContent:'center',elevation:5}}>
      <Icon source={icons.Plus} color="white" size={30}/>
    </Pressable>
  </View>
}
export function Segments({options,value,onChange}:{options:string[];value:string;onChange:(value:string)=>void}){
 const c=useContext(Theme)
 return <View style={{flexDirection:'row',padding:4,borderRadius:14,backgroundColor:c.field}}>
 {options.map(item=><Pressable key={item} onPress={()=>onChange(item)} accessibilityRole="tab" accessibilityState={{selected:item===value}}
 style={{flex:1,alignItems:'center',justifyContent:'center',minHeight:40,borderRadius:10,backgroundColor:item===value?c.card:'transparent'}}>
 <Text style={{color:item===value?c.accent:c.muted,fontWeight:'600'}}>{item}</Text></Pressable>)}</View>
}
export function ReportCard({report,onOpen}:{report:Report;onOpen:()=>void}){
 const c=useContext(Theme),category=categories.find(item=>item.key===report.category)??categories[6]
 const key=report.status.toLowerCase().replace('under_review','review').replace('in_progress','progress')
 const status=statuses.find(item=>item.key===key)
 const stage=key==='rejected'?1:statuses.findIndex(item=>item.key===key)
 return <Pressable accessibilityRole="button" onPress={onOpen} style={{backgroundColor:c.card,borderRadius:22,overflow:'hidden',borderColor:c.line,borderWidth:1}}>
 <View style={{padding:14,gap:12,flexDirection:'row',alignItems:'center'}}>
 <View style={{width:72,height:72,borderRadius:16,alignItems:'center',justifyContent:'center',backgroundColor:category.color+'22'}}><Icon source={category.icon} color={category.color} size={32}/></View>
 <View style={{flex:1,gap:3}}><Text style={{color:category.color,fontSize:12,fontWeight:'600'}}>{category.label}</Text><Text style={{color:c.ink,fontSize:16,fontWeight:'600'}}>{report.title}</Text><Text numberOfLines={1} style={{color:c.muted,fontSize:13}}>{report.code} · {report.landmark}</Text></View></View>
 <View style={{padding:12,borderTopWidth:1,borderColor:c.line,gap:6}}><Text style={{color:c.ink,fontWeight:'600'}}>{status?.label??report.status}</Text><Text style={{fontSize:12,color:c.muted}}>{status?.description}</Text>
 <View style={{flexDirection:'row',gap:4}}>{statuses.slice(0,6).map((item,i)=><View key={item.key} style={{height:4,flex:1,borderRadius:3,backgroundColor:i<=stage?status?.color:c.field}}/>)}</View></View>
 </Pressable>
}
