import { mediaService } from "@/services/media"

export async function getMediaSecureUrl(mediaId: string | number): Promise<string | null> {
  try {
    const response = await mediaService.getMediaById(mediaId)
    return response.secure_url
  } catch (error) {
    console.error('Error fetching media secure URL:', error)
    return null
  }
}

export async function getMediaSecureUrls(mediaIds: (string | number)[]): Promise<(string | null)[]> {
  try {
    const urls = await Promise.all(
      mediaIds.map(id => getMediaSecureUrl(id))
    )
    return urls
  } catch (error) {
    console.error('Error fetching media secure URLs:', error)
    return []
  }
} 