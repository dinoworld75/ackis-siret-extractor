declare module 'playwright-stealth' {
  import {BrowserContext} from 'playwright'
  export default function stealth(context: BrowserContext): Promise<void>
}
