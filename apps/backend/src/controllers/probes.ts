export interface StatusResponse {
    name: string
    status: 'UP' | 'DOWN'
    components?: Omit<StatusResponse, 'components'>[]
}

export interface Decider {
    name: string
    decide: () => boolean
}

export interface ProbesController {
    ready(): StatusResponse
    live(): StatusResponse
    startup(): StatusResponse

    withReadyDecider(decider: Decider): ProbesController
    withLiveDecider(decider: Decider): ProbesController
    withStartupDecider(decider: Decider): ProbesController
}

export class ProbesControllerImpl implements ProbesController {
    readyDeciders = new Set<Decider>()
    liveDeciders = new Set<Decider>()
    startupDeciders = new Set<Decider>()

    withReadyDecider(decider: Decider): ProbesController {
        this.readyDeciders.add(decider)
        return this
    }
    withLiveDecider(decider: Decider): ProbesController {
        this.liveDeciders.add(decider)
        return this
    }
    withStartupDecider(decider: Decider): ProbesController {
        this.startupDeciders.add(decider)
        return this
    }

    ready(): StatusResponse {
        return this.buildResponse(this.readyDeciders)
    }
    live(): StatusResponse {
        return this.buildResponse(this.liveDeciders)
    }
    startup(): StatusResponse {
        return this.buildResponse(this.startupDeciders)
    }

    private buildResponse(deciders: Set<Decider>): StatusResponse {
        var deciderResults = this.checkDeciders(deciders)
        return {
            name: 'global',
            status: deciderResults.every((decider) => decider.status === 'UP')
                ? 'UP'
                : 'DOWN',
            components: deciderResults,
        }
    }

    private checkDeciders(
        deciders: Set<Decider>
    ): Omit<StatusResponse, 'components'>[] {
        return Array.from(deciders).map((decider) => {
            return {
                name: decider.name,
                status: decider.decide() ? 'UP' : 'DOWN',
            }
        })
    }
}
