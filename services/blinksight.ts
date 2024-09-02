import { BlinksightsClient } from 'blinksights-sdk'

export const blinksights = new BlinksightsClient(process.env.BLINKSIGHTS_ACCESS_TOKEN as string)
