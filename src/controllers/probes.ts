
export interface StatusResponse {
    name: string
    status: "UP" | "DOWN"
    components?: Omit<StatusResponse, "components">[]
}

export interface ProbesController {
    Ready(): StatusResponse
    Health(): StatusResponse
    Startup(): StatusResponse
}

export class ProbesControllerImpl implements ProbesController {
    Ready(): StatusResponse {
        return {
            name: "global",
            status: "UP"
        }
    }
    Health(): StatusResponse {
        return {
            name: "global",
            status: "UP"
        }
    }
    Startup(): StatusResponse {
        return {
            name: "global",
            status: "UP"
        }
    }

}