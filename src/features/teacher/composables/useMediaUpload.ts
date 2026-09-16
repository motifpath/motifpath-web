import { useApi } from '@/shared/composables/useApi'
import { describeApiError } from '@/shared/utils/apiError'
import type { components } from '@/api/generated/core-domain'

type MediaContentType = components['schemas']['CreateMediaUploadUrlRequest']['content_type']

// The backend presigns the upload URL against one fixed, representative MIME
// type per category (motifpath-core's s3_media_storage.go mimeType()), not
// whatever the browser reports for the actual file — the PUT's Content-Type
// header must match exactly or S3 rejects it as a signature mismatch.
const PRESIGNED_MIME_TYPE: Record<MediaContentType, string> = {
  image: 'image/png',
  audio: 'audio/mpeg',
}

/**
 * Requests a presigned upload URL and PUTs the file to it directly, so the
 * file's bytes never pass through this app's own server. Always uploads
 * under purpose "library_asset": at authoring time the exercise this image
 * belongs to may not exist yet (a brand-new exercise has no id until it's
 * saved, and there is no endpoint to attach media to an exercise after
 * creation), so there's no exercise_id to send. The resulting URL is just
 * stored as image_url on the exercise or option once the exercise is saved.
 */
export function useMediaUpload() {
  const { coreApi } = useApi()

  async function upload(file: File, contentType: MediaContentType): Promise<string> {
    const { data, error } = await coreApi.POST('/media/upload-url', {
      body: { purpose: 'library_asset', content_type: contentType, file_name: file.name },
    })
    if (!data) {
      throw new Error(describeApiError(error, 'Failed to request an upload URL'))
    }

    const putResponse = await fetch(data.upload_url, {
      method: 'PUT',
      body: file,
      headers: { 'Content-Type': PRESIGNED_MIME_TYPE[contentType] },
    })
    if (!putResponse.ok) {
      throw new Error(`Upload failed with status ${putResponse.status}`)
    }

    return data.object_url
  }

  return { upload }
}
