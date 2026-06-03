import { useEffect, useState } from 'react'

export interface SocialMediaSettings {
  instagram?: string | null
  facebook?: string | null
  x?: string | null
  tiktok?: string | null
  snapchat?: string | null
  youtube?: string | null
  linkedin?: string | null
  threads?: string | null
  bluesky?: string | null
  mastodon?: string | null
}

interface SocialMediaLink {
  key: keyof SocialMediaSettings
  label: string
  url: (handle: string) => string
  icon: string
  color: string
}

export interface ActiveSocialMediaLink extends Omit<SocialMediaLink, 'url'> {
  url: string
}

export const socialMediaPlatforms: SocialMediaLink[] = [
  {
    key: 'instagram',
    label: 'Instagram',
    url: (handle) => `https://instagram.com/${handle}`,
    icon: 'instagram',
    color: '#E4405F',
  },
  {
    key: 'facebook',
    label: 'Facebook',
    url: (handle) => `https://facebook.com/${handle}`,
    icon: 'facebook',
    color: '#1877F2',
  },
  {
    key: 'x',
    label: 'X',
    url: (handle) => `https://x.com/${handle}`,
    icon: 'twitter',
    color: '#000000',
  },
  {
    key: 'tiktok',
    label: 'TikTok',
    url: (handle) => `https://tiktok.com/@${handle}`,
    icon: 'tiktok',
    color: '#000000',
  },
  {
    key: 'snapchat',
    label: 'Snapchat',
    url: (handle) => `https://snapchat.com/add/${handle}`,
    icon: 'snapchat',
    color: '#FFFC00',
  },
  {
    key: 'youtube',
    label: 'YouTube',
    url: (handle) => `https://youtube.com/@${handle}`,
    icon: 'youtube',
    color: '#FF0000',
  },
  {
    key: 'linkedin',
    label: 'LinkedIn',
    url: (handle) => `https://linkedin.com/in/${handle}`,
    icon: 'linkedin',
    color: '#0A66C2',
  },
  {
    key: 'threads',
    label: 'Threads',
    url: (handle) => `https://threads.net/@${handle}`,
    icon: 'threads',
    color: '#000000',
  },
  {
    key: 'bluesky',
    label: 'Bluesky',
    url: (handle) => `https://bsky.app/profile/${handle}`,
    icon: 'bluesky',
    color: '#1185FE',
  },
  {
    key: 'mastodon',
    label: 'Mastodon',
    url: (handle) => `https://${handle}`,
    icon: 'mastodon',
    color: '#563ACC',
  },
]

/**
 * Fetch active social media settings from the showroom
 * Returns only platforms with handles filled in
 */
export async function fetchActiveSocialMedia(): Promise<ActiveSocialMediaLink[]> {
  try {
    const res = await fetch('/api/admin/showroom-settings')
    if (!res.ok) throw new Error('Failed to fetch settings')
    const data = await res.json()
    const settings = data.settings as SocialMediaSettings

    return socialMediaPlatforms
      .filter(platform => settings[platform.key])
      .map(platform => ({
        key: platform.key,
        label: platform.label,
        icon: platform.icon,
        color: platform.color,
        url: platform.url((settings[platform.key] as string).replace(/^@/, '')),
      }))
  } catch (error) {
    console.error('Failed to load social media settings:', error)
    return []
  }
}

/**
 * React hook to fetch and manage active social media links
 */
export function useSocialMedia() {
  const [socialMedia, setSocialMedia] = useState<ActiveSocialMediaLink[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchActiveSocialMedia().then(setSocialMedia).finally(() => setLoading(false))
  }, [])

  return { socialMedia, loading }
}
