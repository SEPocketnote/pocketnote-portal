'use client'

import { useEffect, useRef, useState } from 'react'

type AddressResult = {
  streetAddress: string
  suburb: string
  state: string
  postcode: string
}

declare global {
  interface Window {
    google: any
    initGooglePlaces: () => void
  }
}

let scriptLoaded = false
let scriptLoading = false
const callbacks: (() => void)[] = []

function loadGooglePlaces(apiKey: string, cb: () => void) {
  if (scriptLoaded) { cb(); return }
  callbacks.push(cb)
  if (scriptLoading) return
  scriptLoading = true
  window.initGooglePlaces = () => {
    scriptLoaded = true
    callbacks.forEach(fn => fn())
    callbacks.length = 0
  }
  const script = document.createElement('script')
  script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places&callback=initGooglePlaces`
  script.async = true
  document.head.appendChild(script)
}

export default function AddressAutocomplete({
  value,
  onChange,
  onSelect,
  placeholder = 'Start typing an address…',
  className = '',
}: {
  value: string
  onChange: (value: string) => void
  onSelect: (result: AddressResult) => void
  placeholder?: string
  className?: string
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const autocompleteRef = useRef<any>(null)
  const [ready, setReady] = useState(false)
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_PLACES_API_KEY

  useEffect(() => {
    if (!apiKey) return
    loadGooglePlaces(apiKey, () => setReady(true))
  }, [apiKey])

  useEffect(() => {
    if (!ready || !inputRef.current || autocompleteRef.current) return
    const ac = new window.google.maps.places.Autocomplete(inputRef.current, {
      componentRestrictions: { country: 'au' },
      types: ['address'],
      fields: ['address_components'],
    })
    autocompleteRef.current = ac
    ac.addListener('place_changed', () => {
      const place = ac.getPlace()
      const components: Record<string, string> = {}
      for (const c of place.address_components ?? []) {
        for (const type of c.types) components[type] = c.long_name
        if (c.types.includes('administrative_area_level_1')) components['state_short'] = c.short_name
      }
      const streetNumber = components['street_number'] ?? ''
      const route = components['route'] ?? ''
      const streetAddress = [streetNumber, route].filter(Boolean).join(' ')
      const suburb = components['locality'] || components['sublocality'] || components['postal_town'] || ''
      const state = components['state_short'] || components['administrative_area_level_1'] || ''
      const postcode = components['postal_code'] || ''

      onChange(streetAddress)
      onSelect({ streetAddress, suburb, state, postcode })
    })
  }, [ready, onChange, onSelect])

  return (
    <input
      ref={inputRef}
      type="text"
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      className={className || 'input'}
      autoComplete="off"
    />
  )
}
