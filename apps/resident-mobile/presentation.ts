export const icons = {
  Bell: require('./assets/icons/Bell.png'),
  Building: require('./assets/icons/Building.png'),
  Check: require('./assets/icons/Check.png'),
  ChevronLeft: require('./assets/icons/ChevronLeft.png'),
  ClipboardList: require('./assets/icons/ClipboardList.png'),
  Construction: require('./assets/icons/Construction.png'),
  Eye: require('./assets/icons/Eye.png'),
  EyeOff: require('./assets/icons/EyeOff.png'),
  House: require('./assets/icons/House.png'),
  Inbox: require('./assets/icons/Inbox.png'),
  Map: require('./assets/icons/Map.png'),
  MapPin: require('./assets/icons/MapPin.png'),
  Monitor: require('./assets/icons/Monitor.png'),
  Moon: require('./assets/icons/Moon.png'),
  Mountain: require('./assets/icons/Mountain.png'),
  Plus: require('./assets/icons/Plus.png'),
  Sun: require('./assets/icons/Sun.png'),
  TreePine: require('./assets/icons/TreePine.png'),
  UserRound: require('./assets/icons/UserRound.png'),
  WavesHorizontal: require('./assets/icons/WavesHorizontal.png'),
  Wrench: require('./assets/icons/Wrench.png'),
  Zap: require('./assets/icons/Zap.png'),
} as const

export const categories = [
  { key: 'flooding', label: 'Flooding', color: '#2f7cf6', icon: icons.WavesHorizontal, description: 'Rising water, clogged drains, submerged roads' },
  { key: 'road', label: 'Road Damage', color: '#ef8a2b', icon: icons.Construction, description: 'Potholes, cracks, sinkholes, washed-out lanes' },
  { key: 'building', label: 'Building Damage', color: '#b0683f', icon: icons.Building, description: 'Collapsed walls, roofs, structural cracks' },
  { key: 'tree', label: 'Fallen Trees', color: '#2e9e5b', icon: icons.TreePine, description: 'Uprooted trees or branches blocking the way' },
  { key: 'landslide', label: 'Landslides', color: '#8a6a4c', icon: icons.Mountain, description: 'Soil erosion, rockfall, slope failure' },
  { key: 'electrical', label: 'Electrical Hazards', color: '#d9a40b', icon: icons.Zap, description: 'Downed lines, sparking posts, exposed wiring' },
  { key: 'other', label: 'Other Infrastructure', color: '#6b7a99', icon: icons.Wrench, description: 'Drainage, bridges, streetlights, facilities' },
]

export const statuses = [
  { key: 'pending', label: 'Pending', color: '#8d96aa', description: 'Received and waiting for barangay review' },
  { key: 'review', label: 'Under Review', color: '#8b5cf6', description: 'A barangay official is checking the details' },
  { key: 'verified', label: 'Verified', color: '#0ea5b7', description: 'Confirmed as a valid incident' },
  { key: 'assigned', label: 'Assigned', color: '#3b6ef0', description: 'A responder team has been dispatched' },
  { key: 'progress', label: 'In Progress', color: '#ef8a2b', description: 'Responders are working on site' },
  { key: 'resolved', label: 'Resolved', color: '#22a06b', description: 'The issue has been addressed' },
  { key: 'rejected', label: 'Rejected', color: '#e5372a', description: 'Could not be validated or is out of scope' },
]
