import type { CatActivity } from '../../store/officeStore'

export const CAT_NAME = 'Mochi'
export const CAT_COLOR = '#e58fa8'

export const CAT_ACTIVITY: Record<CatActivity, { label: string; color: string }> = {
  wandering: { label: 'Wandering', color: '#d98a5a' },
  napping: { label: 'Napping', color: '#8a93c9' },
  visiting: { label: 'Visiting', color: '#e58fa8' },
  watching: { label: 'Watching the city', color: '#3b9fd8' },
  begging: { label: 'Hoping for snacks', color: '#e0b04c' },
  purring: { label: 'Purring', color: '#e58fa8' },
}
