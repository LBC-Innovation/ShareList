import { registerProvider } from '../registry'
import { SoundCloudProvider } from './SoundCloudProvider'

registerProvider(new SoundCloudProvider())

export { SoundCloudProvider }
