import type { LxserverSearchResult } from './lxserver'
import type { SearchResultItem } from '@songloft/plugin-sdk'

/** source 代码 → 平台名 */
const SOURCE_TO_PLATFORM: Record<string, string> = {
  kg: 'kugou',
  kw: 'kuwo',
  tx: 'qq',
  wy: 'netease',
  mg: 'migu'
}

/**
 * 把 lxserver 搜索结果转为 SDK SearchResultItem（标准音源搜索响应）。
 * source_data 是不透明 JSON，宿主原样存进 song 表，后续 music/url 时回传。
 */
export function toSearchResultItem(r: LxserverSearchResult): SearchResultItem {
  return {
    title: r.name,
    artist: r.singer,
    album: r.albumName || '',
    duration: parseDuration(r.interval),
    cover_url: r.img || '',
    source_data: buildSourceData(r)
  }
}

/** 构造 source_data：resolveUrl 时需要这些信息向 lxserver 请求播放 URL */
export function buildSourceData(r: LxserverSearchResult): Record<string, unknown> {
  const sd: Record<string, unknown> = {
    name: r.name,
    singer: r.singer,
    source: r.source,
    songmid: r.songmid ?? '',
    types: (r.types || []).map(t => {
      const entry: Record<string, string> = { type: t.type, size: t.size }
      if (t.hash) entry.hash = t.hash
      return entry
    })
  }
  if (r.hash) sd.hash = r.hash
  return sd
}

/**
 * 构造 MIoT 外部搜索接口的完整响应。
 * MIoT 要求一次返回就包含 url，格式与标准音源 API 不同。
 */
export function toMiotResponse(
  r: LxserverSearchResult,
  playUrl: string,
  quality: string
) {
  const songInfo: Record<string, unknown> = {
    musicId: r.songmid ?? '',
    songmid: r.songmid ?? '',
    types: (r.types || []).map(t => {
      const entry: Record<string, string> = { type: t.type, size: t.size }
      if (t.hash) entry.hash = t.hash
      return entry
    })
  }
  if (r.hash) songInfo.hash = r.hash

  return {
    code: 0,
    msg: 'success',
    data: {
      title: r.name,
      artist: r.singer,
      album: r.albumName || '',
      duration: parseDuration(r.interval),
      cover_url: r.img || '',
      url: playUrl,
      source_data: {
        platform: SOURCE_TO_PLATFORM[r.source] || r.source,
        quality,
        songInfo
      }
    }
  }
}

/** MIoT 错误响应 */
export function miotError(code: number, msg: string) {
  return { code, msg, data: null }
}

/** "03:45" → 225（秒） */
function parseDuration(interval?: string): number {
  if (!interval) return 0
  const parts = interval.split(':')
  if (parts.length === 2) {
    const m = parseInt(parts[0], 10)
    const s = parseInt(parts[1], 10)
    if (!isNaN(m) && !isNaN(s)) return m * 60 + s
  }
  return 0
}
