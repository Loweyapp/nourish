import { useState } from 'react'
import type { Favourite } from '../types'
import { getFavourites } from '../lib'

export function useFavourites() {
  const [favourites, setFavourites] = useState<Favourite[]>(() => getFavourites())

  const refresh = () => setFavourites(getFavourites())

  return { favourites, setFavourites, refresh }
}
