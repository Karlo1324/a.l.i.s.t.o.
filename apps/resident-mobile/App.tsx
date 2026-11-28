import {useCallback,useEffect,useRef,useState} from 'react'
import {ActivityIndicator,Alert,BackHandler,Image,Linking,Pressable,ScrollView,StatusBar,Text,useColorScheme,View} from 'react-native'
import {requireNativeModule} from 'expo-modules-core'
import {SafeAreaProvider,SafeAreaView} from 'react-native-safe-area-context'
import {SQLiteProvider,useSQLiteContext} from 'expo-sqlite'
import {deviceDrafts,initialize} from './drafts'
import {evidence,login,news,refreshLogin,register,rpc,type News,type Notice,type Report,type Session} from './backend'
import {Button,Card,dark,Field,Label,light,Theme} from './ui'
import {ReportForm,type SavedDraft} from './ReportForm'
import {ReportDetail,type LocalUpdate} from './ReportDetail'
import {MapExplorer} from './MapExplorer'
import {IncidentMap} from './IncidentMap'
import {Icon, ResidentTabs, ReportCard, Segments} from './ResidentControls'
import {icons} from './presentation'
import {Area} from './Area'

const vault=requireNativeModule<{read():string|null;save(value:string):void;clear():void}>('ResidentSession')
type Page='Welcome'|'Sign in'|'Create account'|'Home'|'Map'|'Reports'|'Profile'|'New report'|'Report details'|'Notifications'|'Personal information'|'Reporting area'
const tabs:Page[]=['Home','Map','New report','Reports','Profile']
function Resident(){
 const db=useSQLiteContext(),system=useColorScheme()
 const [mode,setMode]=useState('Auto'),colors=mode==='Dark'||mode==='Auto'&&system==='dark'?dark:light
 const [page,go]=useState<Page>('Welcome'),[ready,setReady]=useState(false),[restoreError,setRestoreError]=useState('')
 const [session,setSession]=useState<Session|null>(null),active=useRef<Session|null>(null),refreshJob=useRef<Promise<Session>|null>(null)
 const [mail,email]=useState(''),[pass,password]=useState(''),[confirm,confirmTo]=useState(''),[name,nameTo]=useState(''),[visible,show]=useState(false),[responder,role]=useState(false)
 const [busy,working]=useState(false),[message,msg]=useState(''),[tick,reload]=useState(0)
 const [notes,setNotes]=useState<Record<string,LocalUpdate[]>>({})
 const origin=useRef<Page>('Home')
 const [noticeTab,setNoticeTab]=useState('All')
 const [segment,filter]=useState('Active')
 const [reports,setReports]=useState<Report[]>([]),[broadcasts,setNews]=useState<News[]>([]),[notices,setNotices]=useState<Notice[]>([])
 const [drafts,setDrafts]=useState<SavedDraft[]>([]),[report,select]=useState<Report>(),[draft,edit]=useState<SavedDraft>(),[pictures,setPictures]=useState<string[]>([]),[query,Q]=useState('')
 const save=useCallback((value:Session)=>{vault.save(JSON.stringify(value));active.current=value;setSession(value)},[])
 const current=useCallback(async()=>{
 const value=active.current
 if(!value)throw Error('Sign in to continue.')
 if(value.expires>Date.now()+60000)return value
 if(!refreshJob.current)refreshJob.current=refreshLogin(value).then(next=>{if(active.current!==value)throw Error('Account changed.');save(next);return next}).finally(()=>{refreshJob.current=null})
 return refreshJob.current
 },[save])
 const restore=useCallback(async()=>{try{const stored=vault.read();if(stored){const value:Session=JSON.parse(stored);active.current=value;setSession(value);go('Home')}
 const pref=await db.getFirstAsync<{value:string}>("SELECT value FROM preferences WHERE name='theme'");if(pref)setMode(pref.value)
 setRestoreError('')}catch(e){setRestoreError(String(e))}finally{setReady(true)}},[db])
 useEffect(()=>{void restore()},[restore])
 const changePage=(next:Page)=>{if(tabs.includes(page)&&page!=='New report')origin.current=page;msg('');Q('');edit(undefined);go(next)}
 const leave=()=>{vault.clear();active.current=null;setSession(null);setReports([]);setNews([]);setNotices([]);setDrafts([]);select(undefined);setPictures([]);setNotes({});password('');confirmTo('');changePage('Sign in')}
 useEffect(()=>{let alive=true
 if(!['Home','Reports','Map','Notifications'].includes(page))return
 msg('')
 deviceDrafts(db,session?.uid||null).then(rows=>{if(alive)setDrafts(rows)}).catch(e=>{if(alive)msg(e.message)})
 if(session){async function load(){
 const token=await current()
 const results=await Promise.allSettled([rpc<Report[]>(token,'my_resident_reports').then(r=>{if(alive)setReports(r)}),
 news(token).then(r=>{if(alive)setNews(r)}),rpc<Notice[]>(token,'my_resident_notifications').then(r=>{if(alive)setNotices(r)})])
 if(alive){const failure=results.find(r=>r.status==='rejected');if(failure?.status==='rejected')msg(String(failure.reason))}}
 const refresh=()=>load().catch(e=>{if(alive)msg(e.message)})
 void refresh();const timer=setInterval(refresh,30000);return()=>{alive=false;clearInterval(timer)}}
 return()=>{alive=false}
 },[session?.uid,page,tick,current,db])
 useEffect(()=>{let alive=true;setPictures([]);if(page==='Report details'&&report&&session)current().then(t=>Promise.all((report.paths||[]).map(p=>evidence(t,p)))).then(items=>{if(alive)setPictures(items)}).catch(e=>{if(alive)msg(e.message)});return()=>{alive=false}},[page,report,current,session?.uid])
 const back=useCallback(()=>{if(busy)return true;if(page==='Home'||page==='Welcome')return false
 if(page==='New report')return false
 go(page==='Sign in'||page==='Create account'?'Welcome':page==='Report details'||page==='Notifications'?origin.current:page==='Personal information'||page==='Reporting area'?'Profile':'Home');msg('');return true
 },[page,busy])
 useEffect(()=>{const sub=BackHandler.addEventListener('hardwareBackPress',back);return()=>sub.remove()},[back])
 async function authenticate(){
 working(true);msg('')
 try{const result=page==='Create account'?await register(name,mail,pass,responder):await login(mail,pass)
 password('');confirmTo('');show(false)
 if(result){save(result);go('Home')}else{go('Sign in');msg('Check your email to confirm your account.')}}
 catch(e){msg(e instanceof Error?e.message:'Unable to sign in.')}finally{working(false)}
 }
 const closed=(r:Report)=>['resolved','rejected'].includes(r.status.toLowerCase())
 const shown=reports.filter(r=>segment==='All'||(segment==='Closed'?closed(r):!closed(r)))
 const filteredNotices=notices.filter(n=>noticeTab==='All'||(noticeTab==='My Reports'?n.kind==='status':n.kind!=='status'))
 const viewReport=(r:Report)=>{select(r);changePage('Report details')}
 const reportCard=(r:Report)=><ReportCard key={r.id} report={r} onOpen={()=>viewReport(r)}/>
 const auth=['Welcome','Sign in','Create account'].includes(page),creating=page==='Create account'
 const strength=[pass.length>=8,/[A-Z]/.test(pass)&&/[a-z]/.test(pass),/\d/.test(pass),/[^\w]/.test(pass)].filter(Boolean).length
 return <Theme.Provider value={colors}><SafeAreaView style={{flex:1,backgroundColor:page==='Welcome'?'#101f40':colors.bg}}>
 <StatusBar barStyle={page==='Welcome'||colors===dark?'light-content':'dark-content'}/>
 {!ready?<ActivityIndicator/>:restoreError?<View><Label>{restoreError}</Label><Button label="Retry" onPress={restore}/><Button label="Sign in again" onPress={()=>{leave();setRestoreError('')}}/></View>:
 <>{page==='Report details'&&report?<ReportDetail key={report.id} report={report} photos={pictures} back={back} openMap={()=>changePage('Map')}
 updates={notes[report.id]??[]} onUpdate={body=>setNotes(prev=>({...prev,[report.id]:[{body,at:Date.now()},...(prev[report.id]??[])]}))}/>:page==='Map'?<MapExplorer reports={reports} open={viewReport}/>:page==='New report'?<ReportForm initial={draft} account={session} current={current} setBusy={working}
 onCancel={()=>go(origin.current)} onSaved={()=>go(origin.current)} onTrack={async code=>{try{const rows=await rpc<Report[]>(await current(),'my_resident_reports');setReports(rows);const match=rows.find(r=>r.code===code);if(match)viewReport(match);else go('Reports')}catch(e){go('Reports');Alert.alert('Could not load report',String(e))}}}/>:<ScrollView key={page} keyboardShouldPersistTaps="handled" contentContainerStyle={{flexGrow:1,padding:20,gap:14,justifyContent:page==='Welcome'?'center':'flex-start'}}>
 {page!=='Home'&&page!=='Welcome'&&!tabs.includes(page)&&<Pressable accessibilityRole="button" disabled={busy} onPress={back} style={{flexDirection:'row',alignItems:'center',height:44}}><Icon source={icons.ChevronLeft} color={colors.accent}/><Text style={{color:colors.accent,fontSize:17}}>Back</Text></Pressable>}
 {page==='Welcome'?<><Image source={require('./assets/logo-dark.png')} style={{width:72,height:72}}/><Text style={{fontSize:36,fontWeight:'bold',color:'white'}}>Your community, alert and ready.</Text><Text style={{fontSize:18,color:'#d3dded'}}>Record incidents, select their location, and track their progress.</Text><Button label="Sign in" onPress={()=>changePage('Sign in')}/><Button secondary label="Create an account" onPress={()=>changePage('Create account')}/></>:
 <View style={{flexDirection:'row',justifyContent:'space-between',alignItems:'center'}}><Label large>{page==='Reports'?'My Reports':page}</Label>{page==='Home'&&<Pressable accessibilityRole="button" accessibilityLabel={'Notifications, '+notices.filter(n=>!n.read).length+' unread'} style={{backgroundColor:colors.card,borderRadius:24,padding:11}} onPress={()=>changePage('Notifications')}><Icon source={icons.Bell} color={colors.ink}/>{notices.some(n=>!n.read)&&<View style={{position:'absolute',top:7,right:8,width:8,height:8,borderRadius:4,backgroundColor:'#e5372a'}}/>}</Pressable>}</View>}
 {message!==''&&<Label>{message}</Label>}
 {auth&&page!=='Welcome'&&<><Image source={require('./assets/logo-light.png')} style={{width:60,height:60}}/>
 {creating&&<><Field label="Full name" value={name} onChangeText={nameTo}/></>}
 <Field label="Email" autoCapitalize="none" keyboardType="email-address" value={mail} onChangeText={email}/>
 {creating&&<><Label>Account type</Label><Segments options={['Resident','Responder']} value={responder?'Responder':'Resident'} onChange={v=>role(v==='Responder')}/>{responder&&<Label muted>Responder access requires administrator approval. Until approved, this account remains a resident.</Label>}</>}
 <Field label="Password" value={pass} onChangeText={password} secureTextEntry={!visible}/><Button secondary label={visible?'Hide password':'Show password'} onPress={()=>show(!visible)}/>
 {creating&&<><View accessibilityLabel={'Password strength '+strength+' of 4'} style={{flexDirection:'row',gap:4}}>{[1,2,3,4].map(i=><View key={i} style={{flex:1,height:5,backgroundColor:i<=strength?['','#c03930','#db8128','#aba016','#21884b'][strength]:colors.line}}/>)}</View>
 <Field label="Confirm password" value={confirm} onChangeText={confirmTo} secureTextEntry={!visible}/>{confirm!==''&&confirm!==pass&&<Label>Passwords must match.</Label>}</>}
 <Button label={page} disabled={busy||!mail.trim()||!pass||(creating&&(!name.trim()||pass.length<8||confirm!==pass))} onPress={authenticate}/>
 <Button secondary label={creating?'Sign in':'Create account'} disabled={busy} onPress={()=>changePage(creating?'Sign in':'Create account')}/>
 <Button secondary label="Continue as guest" disabled={busy} onPress={()=>changePage('Home')}/></>}
 {page==='Home'&&<><Card><Label>{session?.name||'Guest workspace'}</Label></Card><Button label="Add an incident" onPress={()=>changePage('New report')}/>

 {session&&<><Label large>Resident news</Label>{!broadcasts.length&&<Label muted>No broadcasts yet.</Label>}{broadcasts.map(n=><Card key={n.id}><Label>{n.title}</Label><Label muted>{new Date(n.published_at).toLocaleString()}</Label><Label>{n.body}</Label></Card>)}</>}
 <Label large>Your active reports</Label>{reports.filter(r=>!['resolved','rejected'].includes(r.status.toLowerCase())).map(reportCard)}{!reports.some(r=>!closed(r))&&<Label muted>No active reports.</Label>}
 <IncidentMap height={208} controls={false} reports={reports.filter(r=>!closed(r))} onSelect={viewReport}/><Button secondary label="Open incident map" onPress={()=>changePage('Map')}/></>}
 {page==='Reports'&&<><Button label="Add an incident" onPress={()=>changePage('New report')}/><Button secondary label="Refresh" onPress={()=>reload(v=>v+1)}/>
 <View style={{flexDirection:'row',gap:8}}>{[['Submitted',reports.length,colors.ink],['In progress',reports.filter(r=>!closed(r)).length,'#ef8a2b'],['Resolved',reports.filter(r=>r.status.toLowerCase()==='resolved').length,'#22a06b']].map(([label,count,color])=><View key={label} style={{flex:1,borderRadius:18,padding:12,backgroundColor:colors.card}}><Text style={{fontSize:24,fontWeight:'bold',color:String(color)}}>{count}</Text><Text style={{fontSize:12,color:colors.muted}}>{label}</Text></View>)}</View>
 <Segments options={['Active','Closed','All']} value={segment} onChange={filter}/>
 {!shown.length&&!drafts.length&&<Label>No reports yet.</Label>}{shown.map(reportCard)}
 {drafts.map(d=><Button secondary key={d.id} label={d.title+' · Local draft'} onPress={()=>{edit(d);go('New report')}}/>)}</>}

 {page==='Notifications'&&<><Segments options={['All','My Reports','Advisories']} value={noticeTab} onChange={setNoticeTab}/>
 {session&&<Button secondary label="Read all" onPress={async()=>{try{await rpc(await current(),'mark_my_resident_notifications_read');reload(v=>v+1)}catch(e){msg(String(e))}}}/>}
 {!filteredNotices.length&&<Card><Label>You're all caught up</Label></Card>}{filteredNotices.map(n=><Card key={n.id}><Label>{n.title}</Label><Label>{n.body}</Label><Button secondary label={n.read?'View':'Mark as read'} onPress={async()=>{try{await rpc(await current(),'mark_my_resident_notifications_read',{p_notification_id:n.id});reload(v=>v+1);const match=reports.find(r=>r.id===n.incidentId);if(match)viewReport(match)}catch(e){msg(String(e))}}}/></Card>)}</>}
 {page==='Profile'&&<><Card><Icon source={icons.UserRound} color={colors.ink} size={32}/><Label large>{session?.name||'Guest workspace'}</Label><Label>{session?.email||'No account is signed in.'}</Label></Card><Label>Appearance</Label>
 <Segments options={['Light','Dark','Auto']} value={mode} onChange={async m=>{try{await db.runAsync('INSERT OR REPLACE INTO preferences VALUES(?,?)','theme',m);setMode(m)}catch(e){msg(String(e))}}}/>

 {(['Personal information','Notifications',...(session?['Reporting area']:[])] as Page[]).map(p=><Button key={p} secondary label={p} onPress={()=>changePage(p)}/>)}
 <Button secondary label={session?'Sign out':'Sign in'} onPress={leave}/></>}
 {page==='Personal information'&&<Card><Label>{session?.name||'Guest workspace'}</Label><Label>{session?.email||'No account is signed in.'}</Label></Card>}
 {page==='Reporting area'&&session&&<Area current={current}/>}
 </ScrollView>}
 {tabs.includes(page)&&page!=='New report'&&<ResidentTabs page={page} select={changePage}/>}</>}
 </SafeAreaView></Theme.Provider>
}
export default function App(){return <SafeAreaProvider><SQLiteProvider databaseName="resident-drafts.db" onInit={initialize}><Resident/></SQLiteProvider></SafeAreaProvider>}
