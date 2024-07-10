import React, { useCallback, useEffect, useRef, useState } from "react"
import {GoogleMap, useLoadScript} from "@react-google-maps/api"
import "firebase/compat/firestore"
import {fb} from "../firebase/firebase.ts"
import {MarkerClusterer} from "@googlemaps/markerclusterer"
import {Quest} from "../types/Quest.ts"
import Button from "./Button.tsx"

const center = {
    lat: 48.8584,
    lng: 2.2945
}

const Map: React.FC = () => {
    const { isLoaded, loadError } = useLoadScript({
        googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY
    })

    const [quests, setQuests] = useState<Quest[]>([])
    const mapRef = useRef<google.maps.Map | null>(null)
    const markerClustererRef = useRef<MarkerClusterer | null>(null)

    const loadQuests = useCallback(async () => {
        try {
            const querySnapshot = await fb.collection("quests").get()
            const loadedQuests: Quest[] = []
            querySnapshot.forEach((doc) => {
                const quest = doc.data() as Quest
                loadedQuests.push(quest)
            })
            setQuests(loadedQuests)
        } catch (error) {
            console.error("Error loading quests: ", error)
        }
    }, [])

    const addQuest = useCallback(async (newQuest: Quest) => {
        try {
            const lastQuest = quests[quests.length - 1]
            if (lastQuest) {
                await fb.collection("quests").add({
                    ...newQuest,
                    next: lastQuest.timestamp.toString()
                })
            } else {
                await fb.collection("quests").add(newQuest)
            }
            setQuests((currentQuests) => [...currentQuests, newQuest])
        } catch (error) {
            console.error("Error adding quest: ", error)
        }
    }, [quests])

    const deleteAllQuests = async () => {
        try {
            const querySnapshot = await fb.collection("quests").get()
            const batch = fb.batch()
            querySnapshot.forEach((doc) => {
                batch.delete(doc.ref)
            })
            await batch.commit()
            setQuests([])
            console.log("All markers deleted successfully.")
        } catch (error) {
            console.error("Error deleting markers: ", error)
        }
    }

    const deleteTargetQuest = async (timestamp: number) => {
        try {
            const questRef = fb.collection("quests")
                .where("timestamp", "==", timestamp)
                .limit(1)

            const querySnapshot = await questRef.get()

            if (!querySnapshot.empty) {
                const doc = querySnapshot.docs[0]
                await doc.ref.delete()
                setQuests((currentQuests) => currentQuests.filter(q => q.timestamp !== timestamp))
                console.log(`Quest ${timestamp} deleted successfully.`)
            } else {
                console.error(`No quest found with timestamp ${timestamp}.`)
            }
        } catch (error) {
            console.error(`Error deleting quest ${timestamp}: `, error)
        }
    }

    const handleQuestDrag = useCallback(async (index: number, newPosition: google.maps.LatLngLiteral | null) => {
        if (!newPosition) return
        try {
            const updatedQuests = [...quests]
            updatedQuests[index] = {
                ...updatedQuests[index],
                location: {
                    lat: newPosition.lat,
                    lng: newPosition.lng
                }
            }
            setQuests(updatedQuests)
            const questId = updatedQuests[index].timestamp.toString()
            const questRef = fb.collection("quests").doc(questId)
            const doc = await questRef.get()
            if (doc.exists) {
                await questRef.update({
                    location: {
                        lat: newPosition.lat,
                        lng: newPosition.lng
                    }
                })
            } else {
                console.error(`Document ${questId} does not exist in Firestore.`)
            }
        } catch (error) {
            console.error("Error updating quest location: ", error)
        }
    }, [quests])

    useEffect(() => {
        loadQuests()
    }, [loadQuests])

    useEffect(() => {
        if (isLoaded && mapRef.current) {
            const map = mapRef.current
            if (markerClustererRef.current) {
                markerClustererRef.current.clearMarkers()
            }
            markerClustererRef.current = new MarkerClusterer({ map, markers: [] })
            quests.forEach((quest, index) => {
                if (quest && quest.location && quest.location.lat && quest.location.lng) {
                    const gMarker = new google.maps.Marker({
                        position: { lat: quest.location.lat, lng: quest.location.lng },
                        label: (index + 1).toString(),
                        draggable: true,
                        map
                    })

                    gMarker.addListener("dragend", (event: any) => {
                        handleQuestDrag(index, event.latLng.toJSON())
                    })

                    gMarker.addListener("click", () => {
                        deleteTargetQuest(quest.timestamp)
                    })

                    markerClustererRef.current?.addMarker(gMarker)
                }
            })
        }
    }, [isLoaded, quests, handleQuestDrag])

    const onMapClick = useCallback(
        (event: google.maps.MapMouseEvent) => {
            if (!event.latLng) return
            const newQuest: Quest = {
                location: {
                    lat: event.latLng.lat(),
                    lng: event.latLng.lng()
                },
                timestamp: new Date().getTime()
            }
            addQuest(newQuest)
        },
        [addQuest]
    )

    if (loadError) return <div>Error loading maps</div>
    if (!isLoaded) return <div>Loading Maps</div>

    return (
        <div style={{
            height: '90vh',
            width: '80%', margin: 'auto',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center'}}>
            <Button name={"Delete All Quests"} onClickFunction={deleteAllQuests}/>
            <GoogleMap
                mapContainerStyle={{ width: '100%', height: '100%', borderRadius: '8px' }}
                zoom={8}
                center={center}
                onClick={onMapClick}
                onLoad={(map) => {
                    mapRef.current = map
                }}
            />
        </div>
    )
}

export default Map
