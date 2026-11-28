import {createContext,useContext} from 'react'
import {Pressable, Text, TextInput, View, type TextInputProps} from 'react-native'

export const light = {bg:'#f3f5f9',card:'#ffffff',field:'#f4f6fa',soft:'#e8eefc',ink:'#0b1530',muted:'#4f5a72',accent:'#1f4fd1',onAccent:'#ffffff',line:'rgba(11,30,69,0.08)'}
export const dark = {bg:'#060d1f',card:'#0e1a33',field:'#132242',soft:'rgba(111,155,255,0.14)',ink:'#eef2fa',muted:'#a3aec6',accent:'#6f9bff',onAccent:'#061026',line:'rgba(255,255,255,0.07)'}
export const Theme = createContext(light)
export function Label({children,large=false,muted=false}:{children:React.ReactNode;large?:boolean;muted?:boolean}){
 const c=useContext(Theme)
 return <Text style={{color:muted?c.muted:c.ink,fontSize:large?26:16,fontWeight:large?'700':'400'}}>{children}</Text>
}
export function Button({label,onPress,disabled=false,secondary=false,danger=false}:{label:string;onPress:()=>void;disabled?:boolean;secondary?:boolean;danger?:boolean}){
 const c=useContext(Theme)
 return <Pressable accessibilityRole="button" disabled={disabled} onPress={onPress} style={{padding:13,borderRadius:13,alignItems:'center',backgroundColor:danger?'#e5372a':secondary?c.card:c.accent,borderColor:c.line,borderWidth:secondary?1:0,opacity:disabled?.55:1}}>
 <Text style={{fontWeight:'600',color:danger?'white':secondary?c.ink:c.onAccent,fontSize:16}}>{label}</Text></Pressable>
}
export function Field({label,hideLabel=false,...props}:TextInputProps & {label:string;hideLabel?:boolean}){
 const c=useContext(Theme)
 return <View style={{gap:6}}>{!hideLabel&&<Text style={{color:c.muted,fontSize:13,fontWeight:'600'}}>{label}</Text>}<TextInput accessibilityLabel={label} placeholderTextColor={c.muted} {...props}
 style={{backgroundColor:c.field,color:c.ink,borderColor:c.line,borderWidth:1,borderRadius:12,padding:12,minHeight:48,fontSize:16}}/></View>
}
export function Card({children}:{children:React.ReactNode}){
 const c=useContext(Theme)
 return <View style={{padding:16,borderRadius:18,gap:10,backgroundColor:c.card}}>{children}</View>
}
