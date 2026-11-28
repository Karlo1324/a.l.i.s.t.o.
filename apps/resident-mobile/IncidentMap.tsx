import {useRef,useState} from 'react'
import {Image,PanResponder,Pressable,Text,View} from 'react-native'
import {Button,Label} from './ui'
import type {Report} from './backend'

type Point={lat:number;lng:number}
const center:Point={lat:14.6507,lng:121.1029}
function pixels(point:Point,size:number){
 const radians=Math.max(-85,Math.min(85,point.lat))*Math.PI/180
 return {x:(point.lng+180)/360*size,y:(1-Math.asinh(Math.tan(radians))/Math.PI)/2*size}
}
function point(x:number,y:number,size:number):Point {
 return {lng:((x/size*360)%360+360)%360-180,lat:Math.atan(Math.sinh(Math.PI*(1-2*Math.max(0,Math.min(size,y))/size)))*180/Math.PI}
}
export function IncidentMap({reports=[],initial,onSelect,onPick,heat=false,height=300,full=false,controls=true}:{height?:number;full?:boolean;controls?:boolean;heat?:boolean;reports?:Report[];initial?:Point;onSelect?:(r:Report)=>void;onPick?:(p:Point)=>void}){
 const [focus,setFocus]=useState(initial||reports[0]||center)
 const [zoom,setZoom]=useState(15),[width,setWidth]=useState(320)
 const size=256*2**zoom, origin=pixels(focus,size)
 const start=useRef(origin)
 const pan=PanResponder.create({onMoveShouldSetPanResponder:(_,g)=>Math.abs(g.dx)+Math.abs(g.dy)>8,
 onPanResponderGrant:()=>{start.current=origin},
 onPanResponderRelease:(_,g)=>setFocus(point(start.current.x-g.dx,start.current.y-g.dy,size))})
 const left=origin.x-width/2,top=origin.y-height/2
 const tiles=[]
 for(let x=Math.floor(left/256);x<=Math.floor((left+width)/256);x++)for(let y=Math.floor(top/256);y<=Math.floor((top+height)/256);y++){
   if(y<0||y>=2**zoom)continue
   const tx=((x%2**zoom)+2**zoom)%2**zoom
   tiles.push(<Image key={zoom+'/'+x+'/'+y} source={{uri:'https://tile.openstreetmap.org/'+zoom+'/'+tx+'/'+y+'.png',headers:{'User-Agent':'ALISTO-Resident-Android/1.0'}}}
     style={{position:'absolute',left:x*256-left,top:y*256-top,width:256,height:256}}/>)
 }
 return <View style={{gap:8}}>
 <View onLayout={e=>setWidth(e.nativeEvent.layout.width)} {...pan.panHandlers} style={{height,overflow:'hidden',backgroundColor:'#d5e2df',borderRadius:full?0:15}}>
 {tiles}<Pressable accessibilityRole="button" accessibilityLabel="Select map location" style={{position:'absolute',inset:0}}
 onPress={e=>{if(onPick){const p=point(left+e.nativeEvent.locationX,top+e.nativeEvent.locationY,size);setFocus(p);onPick(p)}}}/>
 {onPick && <Text pointerEvents="none" style={{position:'absolute',left:width/2-8,top:height/2-12,color:'#bb1818',fontSize:22}}>●</Text>}
 {heat&&reports.map(r=>{const p=pixels(r,size);return <View pointerEvents="none" key={r.id} style={{position:"absolute",left:p.x-left-32,top:p.y-top-32,width:64,height:64,borderRadius:32,backgroundColor:"rgba(255,80,25,0.18)"}}/>})}
 {reports.map(r=>{const p=pixels(r,size);return <Pressable key={r.id} accessibilityLabel={r.title} onPress={()=>onSelect?.(r)}
 style={{position:'absolute',left:p.x-left-12,top:p.y-top-12,width:24,height:24,borderRadius:12,backgroundColor:'#dc342a',borderColor:'white',borderWidth:3}}/>})}
 <Text style={{position:'absolute',bottom:0,right:0,backgroundColor:'white',color:'black',fontSize:11}}>© OpenStreetMap contributors</Text></View>
 {controls&&<View style={full?{position:'absolute',right:12,bottom:75,gap:4}:{flexDirection:'row',gap:10}}><Button secondary label="−" disabled={zoom<=3} onPress={()=>setZoom(zoom-1)}/><Button secondary label="+" disabled={zoom>=19} onPress={()=>setZoom(zoom+1)}/></View>}
 {onPick && <Label muted>Tap the incident location on the map.</Label>}</View>
}
