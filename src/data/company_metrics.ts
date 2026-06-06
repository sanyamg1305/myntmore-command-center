// Metrics for TJ Personal Brand and Myntmore Company Content

export interface CompanyMetric {
  id: string
  name: string
  type: 'number' | 'percentage' | 'textarea' | 'auto'
  unit?: string
  hasTarget?: boolean
}

// --- TJ PERSONAL BRAND ---

export const TJ_INSTAGRAM_METRICS: CompanyMetric[] = [
  { id: 'TJI01', name: 'Stories Posted', type: 'number', hasTarget: true },
  { id: 'TJI02', name: 'Carousels Posted', type: 'number', hasTarget: true },
  { id: 'TJI03', name: 'Reels Posted', type: 'number', hasTarget: true },
  { id: 'TJI04', name: 'Total Posts', type: 'auto', unit: '', hasTarget: true },
  { id: 'TJI05', name: 'Impressions', type: 'number', unit: 'K', hasTarget: true },
  { id: 'TJI06', name: 'Likes', type: 'number' },
  { id: 'TJI07', name: 'Comments', type: 'number' },
  { id: 'TJI08', name: 'Shares', type: 'number' },
  { id: 'TJI09', name: 'Saves', type: 'number' },
  { id: 'TJI10', name: 'Followers Gained', type: 'number', hasTarget: true },
  { id: 'TJI11', name: 'Total Follower Count', type: 'number' },
]

export const TJ_YOUTUBE_METRICS: CompanyMetric[] = [
  { id: 'TJY01', name: 'Shorts Uploaded', type: 'number', hasTarget: true },
  { id: 'TJY02', name: 'Views', type: 'number', unit: 'K' },
  { id: 'TJY03', name: 'Impressions', type: 'number', unit: 'K' },
  { id: 'TJY04', name: 'Likes', type: 'number' },
  { id: 'TJY05', name: 'Comments', type: 'number' },
  { id: 'TJY06', name: 'New Subscribers', type: 'number', hasTarget: true },
  { id: 'TJY07', name: 'Total Subscribers', type: 'number' },
  { id: 'TJY08', name: 'Watch Time', type: 'number', unit: 'hrs' },
]

export const TJ_PODCAST_METRICS: CompanyMetric[] = [
  { id: 'TJP01', name: 'LinkedIn Newsletter Subs', type: 'number', hasTarget: true },
  { id: 'TJP02', name: 'Email Newsletter Subs', type: 'number', hasTarget: true },
  { id: 'TJP03', name: 'Podcast Listens', type: 'number', hasTarget: true },
  { id: 'TJP04', name: 'Podcast Downloads', type: 'number' },
]

export const TJ_VIDEO_METRICS: CompanyMetric[] = [
  { id: 'TJV01', name: 'Videos Shot', type: 'number' },
  { id: 'TJV02', name: 'Videos Edited', type: 'number' },
  { id: 'TJV03', name: 'Videos Scheduled', type: 'number' },
]

// --- MM COMPANY CONTENT ---

export const MM_LINKEDIN_METRICS: CompanyMetric[] = [
  { id: 'MML01', name: 'Posts Published', type: 'number', hasTarget: true },
  { id: 'MML02', name: 'Impressions', type: 'number', unit: 'K', hasTarget: true },
  { id: 'MML03', name: 'Reactions', type: 'number' },
  { id: 'MML04', name: 'Comments', type: 'number' },
  { id: 'MML05', name: 'New Followers', type: 'number', hasTarget: true },
  { id: 'MML06', name: 'Total Followers', type: 'number' },
  { id: 'MML07', name: 'Page Views', type: 'number' },
]

export const MM_INSTAGRAM_METRICS: CompanyMetric[] = [
  { id: 'MMI01', name: 'Posts Published', type: 'number', hasTarget: true },
  { id: 'MMI02', name: 'Stories', type: 'number' },
  { id: 'MMI03', name: 'Reels', type: 'number' },
  { id: 'MMI04', name: 'Impressions', type: 'number', unit: 'K' },
  { id: 'MMI05', name: 'Reach', type: 'number', unit: 'K' },
  { id: 'MMI06', name: 'Engagement', type: 'number' },
  { id: 'MMI07', name: 'New Followers', type: 'number', hasTarget: true },
  { id: 'MMI08', name: 'Total Followers', type: 'number' },
  { id: 'MMI09', name: 'ORM Replies', type: 'number' },
]

export const MM_WEBSITE_METRICS: CompanyMetric[] = [
  { id: 'MMW01', name: 'Active Users', type: 'number', hasTarget: true },
  { id: 'MMW02', name: 'New Users', type: 'number' },
  { id: 'MMW03', name: 'Avg Session Duration', type: 'number', unit: 's' },
  { id: 'MMW04', name: 'Bounce Rate', type: 'percentage' },
  { id: 'MMW05', name: 'Blogs Published', type: 'number', hasTarget: true },
  { id: 'MMW06', name: 'Blog Traffic', type: 'number' },
]

export const MM_OTHER_METRICS: CompanyMetric[] = [
  { id: 'MMO01', name: 'Quora: Answers Posted', type: 'number' },
  { id: 'MMO02', name: 'Quora: Views', type: 'number', unit: 'K' },
  { id: 'MMO03', name: 'Quora: Upvotes', type: 'number' },
  { id: 'MMO04', name: 'Quora: Profile Views', type: 'number' },
  { id: 'MMO05', name: 'Reddit: Posts Published', type: 'number' },
  { id: 'MMO06', name: 'Reddit: Upvotes', type: 'number' },
  { id: 'MMO07', name: 'Reddit: Comments', type: 'number' },
  { id: 'MMO08', name: 'Reddit: Post Views', type: 'number', unit: 'K' },
]
