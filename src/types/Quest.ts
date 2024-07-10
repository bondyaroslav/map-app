export interface Quest {
    location: {
        lat: number
        lng: number
    }
    timestamp: number
    next?: string
}
