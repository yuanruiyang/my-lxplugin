import type { HTTPRequest, HTTPResponse } from '@songloft/plugin-sdk'
import router from './router'

async function onInit(): Promise<void> {
  console.log('[LxBridge] Plugin mounted')
}

async function onDeinit(): Promise<void> {
  console.log('[LxBridge] Plugin unmounted')
}

async function onHTTPRequest(req: HTTPRequest): Promise<HTTPResponse> {
  return await router.handle(req)
}

globalThis.onInit = onInit
globalThis.onDeinit = onDeinit
globalThis.onHTTPRequest = onHTTPRequest
