// Server-render checks. The map is replaced only here because Leaflet requires a browser.
const fs = require('node:fs')
const assert = require('node:assert/strict')
const ts = require('typescript')
const React = require('react')
const { renderToString } = require('react-dom/server')

for (const extension of ['.ts', '.tsx']) {
  require.extensions[extension] = (module, filename) => {
    if (filename.endsWith('/components/Map.tsx')) {
      module.exports = { MapView: ({ children }) => React.createElement('div', null, children) }
      return
    }
    module._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2020, esModuleInterop: true },
    }).outputText, filename)
  }
}
require.extensions['.png'] = (module, filename) => { module.exports = filename }
global.localStorage = { getItem: () => null }
global.window = { matchMedia: () => ({ matches: false }), innerWidth: 1280, innerHeight: 900 }
global.location = { hash: '' }

const data = require('../src/data/records.ts')
for (const key of ['INITIAL_INCIDENTS', 'INITIAL_AUDIT', 'INITIAL_RESIDENT_NOTIFS', 'INITIAL_STAFF_NOTIFS', 'RESPONDERS', 'STAFF', 'ANNOUNCEMENTS', 'LANDMARKS']) {
  assert.equal(data[key].length, 0, `${key} must start empty`)
}
const { StoreProvider, useStore } = require('../src/store.tsx')
const { AdminCtx, WORKSPACE_USERS } = require('../src/admin/common.tsx')
const { NavCtx } = require('../src/resident/common.tsx')
const noop = () => {}
const nav = { stage: 'app', tab: 'home', setStage: noop, setTab: noop, push: noop, pop: noop, replace: noop, openSheet: noop }
let currentStore
function CaptureStore() { currentStore = useStore(); return null }
let count = 0
function render(component, role = 'official', props = {}, param) {
  const ctx = { role, user: WORKSPACE_USERS[role], page: 'overview', param, settings: { aiEnabled: false, aiThreshold: 70, dupRadius: 150, autoEscalate: false }, go: noop, setRole: noop, setSettings: noop }
  const html = renderToString(React.createElement(StoreProvider, null,
    React.createElement(CaptureStore),
    React.createElement(AdminCtx.Provider, { value: ctx },
      React.createElement(NavCtx.Provider, { value: nav }, React.createElement(component, props)))))
  assert.ok(!html.includes('NaN'), 'No invalid metric values')
  assert.ok(!/Maria Santos|Dalisay|Kgd\. Ramon|2,418|112\.198/.test(html), 'No fictional operational records')
  count++
  return html
}
const adminScreens = { Overview: 'Overview', Analytics: 'Analytics', Assignment: 'Assignment', Verification: 'Verification', Tasks: 'Tasks', Monitoring: 'Monitoring', Incidents: 'Incidents', Users: 'UsersPage', Settings: 'SettingsPage', Activity: 'ActivityPage' }
for (const [file, name] of Object.entries(adminScreens)) {
  const component = require(`../src/admin/${file}.tsx`)[name]
  for (const role of ['official', 'responder', 'admin']) render(component, role)
}
const residentScreens = { Home: ['Home'], Profile: ['Profile', 'PersonalInfo', 'NotifSettings'], Notifications: ['Notifications'], Reports: ['MyReports'], MapScreen: ['MapScreen'], Auth: ['Login', 'Register', 'Forgot'], ReportFlow: ['ReportFlow'] }
for (const [file, names] of Object.entries(residentScreens)) {
  for (const name of names) render(require(`../src/resident/${file}.tsx`)[name])
}
render(require('../src/resident/Onboarding.tsx').Onboarding, 'official', { onLightStatus: noop })
render(require('../src/admin/Login.tsx').StaffLogin, 'official', { onDone: noop, onExit: noop })
render(require('../src/App.tsx').default)

// User-entered data must not gain fabricated photos, AI results, or verified identity.
const report = currentStore.submitReport({ category: 'road', title: 'User-entered report', description: 'Description supplied by the user', photos: [], x: 50, y: 50, address: 'Selected coordinates', purok: 'Area not verified', danger: false, affected: 0, anonymous: true })
assert.equal(report.ai, undefined)
assert.equal(report.reporter.verified, false)
assert.deepEqual(report.photos, [])
assert.equal(report.confirmations, 0)
assert.match(report.code, new RegExp(`^ALS-${new Date().getFullYear()}-`))
assert.notEqual(report.id, currentStore.submitReport({ ...report }).id)

// Use this returned report as the input for separate fresh renders, including the no-photo case.
data.INITIAL_INCIDENTS.push(report)
render(require('../src/admin/Verification.tsx').Verification, 'official', {}, report.id)
render(require('../src/admin/IncidentDrawer.tsx').IncidentDrawer, 'official', { incident: null, onClose: noop })
render(require('../src/resident/Reports.tsx').ReportDetail, 'official', { id: report.id })
report.status = 'verified'
render(require('../src/admin/Assignment.tsx').Assignment, 'official', {}, report.id)
render(require('../src/admin/Analytics.tsx').Analytics)
data.INITIAL_INCIDENTS.length = 0
console.log(`PASS: ${count} server-render checks; empty collections; user-entered reports without fabricated AI, photos, or identity. Browser map interactions are not covered.`)
