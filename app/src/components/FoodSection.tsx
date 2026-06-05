import { useState, useRef } from 'react'
import type { FoodItem, DrinkItem, Favourite } from '../types'
import {
  askClaude, getApiKey, r1, extractJSON,
  getFavourites, addFavourite, incrementFavUseCount,
} from '../lib'
import { Section, Icon, Spinner, AnalyseBtn, HourSelect, AIBubble, ChatWidget } from './shared'

interface FoodSummaryHeaderProps {
  foodItems: FoodItem[]
  totalCals: number
}

function FoodSummaryHeader({ foodItems, totalCals }: FoodSummaryHeaderProps) {
  const tp = Math.round(foodItems.reduce((s, f) => s + (f.protein_g || 0), 0) * 10) / 10
  const tc = Math.round(foodItems.reduce((s, f) => s + (f.carbs_g || 0), 0) * 10) / 10
  const tf = Math.round(foodItems.reduce((s, f) => s + (f.fat_g || 0), 0) * 10) / 10
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 14 }}>
      <div>
        <span style={{ fontSize: 36, fontWeight: 800, color: '#111111', lineHeight: 1 }}>{totalCals}</span>
        <span style={{ fontSize: 14, color: '#767676', marginLeft: 4 }}>kcal today</span>
      </div>
      {(tp > 0 || tc > 0 || tf > 0) && (
        <div style={{ textAlign: 'right', fontSize: 12, color: '#767676', lineHeight: 1.8 }}>
          {tp}g protein<br />{tc}g carbs · {tf}g fat
        </div>
      )}
    </div>
  )
}

type PendingItem = {
  _multiSummary?: boolean | undefined
  text?: string | undefined
  calories?: number | undefined
  protein_g?: number | undefined
  carbs_g?: number | undefined
  fat_g?: number | undefined
  units?: number | undefined
  drink_type?: string | null | undefined
  abv?: number | null | undefined
  volume_ml?: number | null | undefined
  commentary?: string | undefined
}

interface FoodSectionProps {
  foodItems: FoodItem[]
  onUpdate: (food: FoodItem[]) => void
  alcoholItems: DrinkItem[]
  onAlcoholUpdate: (alcohol: DrinkItem[]) => void
  dayContext: string
  fitbitData?: unknown
}

export default function FoodSection({ foodItems, onUpdate, alcoholItems, onAlcoholUpdate, dayContext }: FoodSectionProps) {
  const [text, setText] = useState('')
  const [loading, setLoading] = useState(false)
  const [imageLoading, setImageLoading] = useState(false)
  const [pending, setPending] = useState<PendingItem | null>(null)
  const [pendingDrink, setPendingDrink] = useState<PendingItem | null>(null)
  const [pendingTime, setPendingTime] = useState('')
  const [previewSrc, setPreviewSrc] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [showFavs, setShowFavs] = useState(false)
  const [showAllItems, setShowAllItems] = useState(false)
  const [selectedFavs, setSelectedFavs] = useState<string[]>([])
  const [favourites, setFavourites] = useState<Favourite[]>(() => getFavourites())
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const resizeImage = (file: File): Promise<{ b64: string; mediaType: string }> => new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(new Error('Failed to read file'))
    reader.onload = (e) => {
      const img = new Image()
      img.onerror = () => reject(new Error('Failed to decode image'))
      img.onload = () => {
        const MAX = 1024
        let { width: w, height: h } = img
        if (w > MAX || h > MAX) { if (w > h) { h = Math.round(h * MAX / w); w = MAX } else { w = Math.round(w * MAX / h); h = MAX } }
        const canvas = document.createElement('canvas')
        canvas.width = w; canvas.height = h
        canvas.getContext('2d')!.drawImage(img, 0, 0, w, h)
        resolve({ b64: canvas.toDataURL('image/jpeg', 0.85).split(',')[1] as string, mediaType: 'image/jpeg' })
      }
      img.src = e.target!.result as string
    }
    reader.readAsDataURL(file)
  })

  const handleImage = async (file?: File) => {
    if (!file) return
    setImageLoading(true); setPending(null); setPendingDrink(null); setText(''); setError('')
    const pr = new FileReader(); pr.onload = e => setPreviewSrc(e.target!.result as string); pr.readAsDataURL(file)
    try {
      const { b64, mediaType } = await resizeImage(file)
      const key = getApiKey()
      const resp = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-api-key': key ?? '', 'anthropic-version': '2023-06-01', 'anthropic-dangerous-direct-browser-access': 'true' },
        body: JSON.stringify({ model: 'claude-sonnet-4-20250514', max_tokens: 400,
          messages: [{ role: 'user', content: [
            { type: 'image', source: { type: 'base64', media_type: mediaType, data: b64 } },
            { type: 'text', text: "Describe what you see in this image. It could be food, a drink, or both. If it's a food: include estimated portions (e.g. '2 scrambled eggs on toast'). If it's an alcoholic drink or bottle/can label: include the drink type, volume, and ABV% if visible on the label (e.g. 'pint of Guinness 4.2%', '175ml glass of red wine approx 13%', '330ml can of Stella Artois 5%'). Be concise — just the description, no other commentary." }
          ]}]
        })
      })
      const raw = await resp.text()
      let data: { error?: { message?: string }; content?: Array<{ text?: string }> }
      try { data = JSON.parse(raw) as typeof data } catch { throw new Error('Bad response') }
      if (!resp.ok || data.error) throw new Error(data.error?.message ?? `HTTP ${resp.status}`)
      setText(data.content?.[0]?.text ?? '')
    } catch (e) {
      const msg = (e as Error)?.message ?? String(e)
      const friendly = /overload/i.test(msg) ? 'Claude is busy right now — please try again in a moment.'
        : /network|failed to fetch/i.test(msg) ? 'Network error — check your connection and try again.'
        : "Couldn't identify the image — try again or type the description instead."
      setError(friendly)
    }
    setImageLoading(false)
  }

  const analyse = async () => {
    if (!text.trim()) return
    setLoading(true); setPending(null); setPendingDrink(null); setError('')
    const nowHour = new Date().getHours()
    setPendingTime(`${String(nowHour).padStart(2, '0')}:00`)
    try {
      const resp = await askClaude(
        [{ role: 'user', content: `User entry: "${text}"` }],
        `You are a nutrition and drinks expert. The user may enter a single item or multiple meals at once, e.g. "Lunch 2 eggs and salad. Dinner steak and broccoli."

Return ONLY valid JSON, no markdown.

CRITICAL RULES:
- "type" must be "alcohol" ONLY if the drink contains alcohol (beer, wine, spirits, cider etc). Non-alcoholic drinks (water, juice, tea, coffee, coke, lemonade etc) are type "food".
- "type" is "both" ONLY if the entry contains BOTH food AND an alcoholic drink.
- "units" must be 0 for anything non-alcoholic. Never assign units to soft drinks, juices, or other non-alcoholic beverages.
- UK alcohol units = (volume_ml * abv%) / 1000

If SINGLE food or drink:
{"multi":false,"type":"food"|"alcohol"|"both","calories":<n>,"protein_g":<n>,"carbs_g":<n>,"fat_g":<n>,"units":<n>,"drink_type":"<or null>","abv":<n or null>,"volume_ml":<n or null>,"commentary":"<2-3 sentences>"}

If MULTIPLE meals/items:
{"multi":true,"items":[{"text":"<description>","type":"food"|"alcohol"|"both","suggested_time":"<HH:00 best guess e.g. 08:00 for breakfast, 13:00 for lunch, 19:00 for dinner>","calories":<n>,"protein_g":<n>,"carbs_g":<n>,"fat_g":<n>,"units":<n>,"drink_type":"<or null>","abv":<n or null>,"volume_ml":<n or null>}],"commentary":"<2-3 sentence overall summary>"}

User's day so far: ${dayContext}
Accuracy rules:
- Assume typical UK restaurant/home portions unless the user specifies (e.g. "large", "small", "half")
- For branded items (e.g. "Big Mac", "Pret tuna baguette") use the actual published nutritional values
- For homemade dishes, assume standard UK recipe quantities
- Never round calories to the nearest 100 — give a realistic specific estimate
- If the description is ambiguous about portion size, assume a standard adult portion
Be realistic. UK measurements and British English.`
      )
      type ParsedSingle = { multi: false; type: string; calories: number; protein_g: number; carbs_g: number; fat_g: number; units: number; drink_type?: string | null; abv?: number | null; volume_ml?: number | null; commentary?: string }
      type ParsedMultiItem = { text: string; type: string; suggested_time?: string; calories: number; protein_g: number; carbs_g: number; fat_g: number; units: number; drink_type?: string | null; abv?: number | null; volume_ml?: number | null }
      type ParsedMulti = { multi: true; items: ParsedMultiItem[]; commentary?: string }
      const parsed = JSON.parse(extractJSON(resp)) as ParsedSingle | ParsedMulti
      if (parsed.multi) {
        const newFood: FoodItem[] = [], newDrinks: DrinkItem[] = []
        for (const item of parsed.items) {
          const t = item.suggested_time ?? '12:00'
          const rounded = { ...item, calories: r1(item.calories), protein_g: r1(item.protein_g), carbs_g: r1(item.carbs_g), fat_g: r1(item.fat_g), units: r1(item.units), time: t }
          if (item.type === 'alcohol') newDrinks.push(rounded as DrinkItem)
          else if (item.type === 'both') { newFood.push(rounded as FoodItem); newDrinks.push(rounded as DrinkItem) }
          else newFood.push(rounded as FoodItem)
        }
        if (newFood.length) onUpdate([...foodItems, ...newFood])
        if (newDrinks.length) onAlcoholUpdate([...alcoholItems, ...newDrinks])
        const totalCals = parsed.items.reduce((s, i) => s + (i.calories || 0), 0)
        const totalProt = r1(parsed.items.reduce((s, i) => s + (i.protein_g || 0), 0))
        const totalCarb = r1(parsed.items.reduce((s, i) => s + (i.carbs_g || 0), 0))
        const totalFat = r1(parsed.items.reduce((s, i) => s + (i.fat_g || 0), 0))
        setPending({ _multiSummary: true, commentary: parsed.commentary, calories: totalCals, protein_g: totalProt, carbs_g: totalCarb, fat_g: totalFat })
        setText('')
      } else {
        const rp = { ...parsed, calories: r1(parsed.calories), protein_g: r1(parsed.protein_g), carbs_g: r1(parsed.carbs_g), fat_g: r1(parsed.fat_g), units: r1(parsed.units), text: text.trim() }
        if (parsed.type === 'alcohol') setPendingDrink(rp)
        else if (parsed.type === 'both') { setPending(rp); setPendingDrink(rp) }
        else setPending(rp)
      }
    } catch (e) { setError((e as Error).message || "Couldn't analyse — try being more specific.") }
    setLoading(false)
  }

  const addSelectedFavourites = () => {
    if (!selectedFavs.length) return
    const nowHour = new Date().getHours()
    const nowTime = String(nowHour).padStart(2, '0') + ':00'
    const toAdd = favourites.filter(f => selectedFavs.includes(f.name || f.text))
    const newFood: FoodItem[] = [], newDrinks: DrinkItem[] = []
    toAdd.forEach(fav => {
      const item = { text: fav.name || fav.text, calories: fav.calories || 0, protein_g: fav.protein_g || 0, carbs_g: fav.carbs_g || 0, fat_g: fav.fat_g || 0, units: fav.units || 0, time: nowTime }
      if ((fav.units ?? 0) > 0) newDrinks.push(item)
      else newFood.push(item)
    })
    if (newFood.length) onUpdate([...foodItems, ...newFood])
    if (newDrinks.length) onAlcoholUpdate([...alcoholItems, ...newDrinks])
    incrementFavUseCount(selectedFavs)
    setFavourites(getFavourites())
    setSelectedFavs([])
    setShowFavs(false)
  }

  const toggleFavSelection = (nameOrText: string) => {
    setSelectedFavs(prev => prev.includes(nameOrText) ? prev.filter(t => t !== nameOrText) : [...prev, nameOrText])
  }

  const [savingFavName, setSavingFavName] = useState('')
  const [showFavNameInput, setShowFavNameInput] = useState(false)
  const [favSaved, setFavSaved] = useState(false)

  const openSaveFav = () => {
    if (!pending?.text) return
    setSavingFavName(''); setShowFavNameInput(true); setFavSaved(false)
  }

  const confirmSaveFav = () => {
    if (!pending?.text) return
    const name = savingFavName.trim() || pending.text
    addFavourite({ name, text: pending.text, calories: pending.calories || 0, protein_g: pending.protein_g || 0, carbs_g: pending.carbs_g || 0, fat_g: pending.fat_g || 0, units: pendingDrink?.units || 0 })
    if (savingFavName.trim()) {
      setPending(p => p ? { ...p, text: savingFavName.trim() } : p)
      if (pendingDrink) setPendingDrink(p => p ? { ...p, text: savingFavName.trim() } : p)
    }
    setFavourites(getFavourites()); setShowFavNameInput(false); setFavSaved(true)
    setTimeout(() => setFavSaved(false), 2000)
  }

  const addItem = () => {
    const nowTime = pendingTime
    if (pending) onUpdate([...foodItems, { ...pending, time: nowTime } as FoodItem])
    if (pendingDrink) onAlcoholUpdate([...alcoholItems, { ...pendingDrink, time: nowTime } as DrinkItem])
    setText(''); setPending(null); setPendingDrink(null); setPendingTime(''); setPreviewSrc(null)
  }

  const removeFood = (i: number) => onUpdate(foodItems.filter((_, idx) => idx !== i))
  const removeDrink = (i: number) => onAlcoholUpdate(alcoholItems.filter((_, idx) => idx !== i))
  const updateFoodTime = (i: number, t: string) => onUpdate(foodItems.map((f, idx) => idx === i ? { ...f, time: t } : f))
  const updateDrinkTime = (i: number, t: string) => onAlcoholUpdate(alcoholItems.map((a, idx) => idx === i ? { ...a, time: t } : a))

  const totalCals = foodItems.reduce((s, f) => s + (f.calories || 0), 0)
  const totalUnits = alcoholItems.reduce((s, a) => s + (a.units || 0), 0)

  const isPending = pending || pendingDrink
  const chatCtx = pending
    ? `Item: "${pending.text}". ${pending.calories} kcal, ${pending.protein_g}g protein, ${pending.carbs_g}g carbs, ${pending.fat_g}g fat${pendingDrink ? `, ${pendingDrink.units} alcohol units` : ''}. Assessment: ${pending.commentary}`
    : pendingDrink ? `Drink: "${pendingDrink.text}". ${pendingDrink.units} units, ${pendingDrink.calories} kcal. ${pendingDrink.commentary}` : null

  type AllItem = (FoodItem  ) & { _type: 'food' | 'drink'; _i: number }
  const allItems: AllItem[] = [
    ...foodItems.map((f, i) => ({ ...f, _type: 'food' as const, _i: i })),
    ...alcoholItems.map((a, i) => ({ ...a, _type: 'drink' as const, _i: i })),
  ].sort((a, b) => (a.time ?? '').localeCompare(b.time ?? ''))

  const renderLogItem = (item: AllItem, idx: number, key: string) => item._type === 'food' ? (
    <div key={`${key}-f${item._i}-${idx}`} style={{ padding: '12px 0', borderBottom: '1px solid #f5f5f5' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{ flex: 1, minWidth: 0, paddingRight: 8 }}>
          <div style={{ fontWeight: 600, color: '#111111', fontSize: 14, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{(item as FoodItem).text}</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 3 }}>
            <HourSelect value={item.time ?? '08:00'} onChange={t => updateFoodTime(item._i, t)} />
            {(item as FoodItem).meal && <span style={{ fontSize: 12, color: '#767676' }}>· {(item as FoodItem).meal}</span>}
          </div>
          {((item as FoodItem).protein_g || (item as FoodItem).carbs_g || (item as FoodItem).fat_g) ? (
            <div style={{ display: 'flex', gap: 5, marginTop: 6, flexWrap: 'wrap' }}>
              {(item as FoodItem).protein_g > 0 && <span style={{ fontSize: 12, padding: '2px 8px', borderRadius: 20, background: '#edfaf2', color: '#2d6a3f', fontWeight: 600 }}>{Math.round((item as FoodItem).protein_g)}g P</span>}
              {(item as FoodItem).carbs_g > 0 && <span style={{ fontSize: 12, padding: '2px 8px', borderRadius: 20, background: '#eef4ff', color: '#1a4090', fontWeight: 600 }}>{Math.round((item as FoodItem).carbs_g)}g C</span>}
              {(item as FoodItem).fat_g > 0 && <span style={{ fontSize: 12, padding: '2px 8px', borderRadius: 20, background: '#ffeef4', color: '#801030', fontWeight: 600 }}>{Math.round((item as FoodItem).fat_g)}g F</span>}
            </div>
          ) : null}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontWeight: 700, color: '#111111', fontSize: 18, lineHeight: 1 }}>{(item as FoodItem).calories}</div>
            <div style={{ fontSize: 12, color: '#767676', marginTop: 1 }}>kcal</div>
          </div>
          <button onClick={() => removeFood(item._i)} style={{ background: 'none', border: 'none', color: '#999999', fontSize: 18, lineHeight: 1, padding: '0 2px', marginTop: 2 }}>×</button>
        </div>
      </div>
    </div>
  ) : (
    <div key={`${key}-d${item._i}-${idx}`} style={{ padding: '12px 0', borderBottom: '1px solid #f5f5f5' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{ flex: 1, minWidth: 0, paddingRight: 8 }}>
          <div style={{ fontWeight: 600, color: '#111111', fontSize: 14, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{(item as DrinkItem).drink_type || (item as DrinkItem).text}</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 3 }}>
            <HourSelect value={item.time ?? '08:00'} onChange={t => updateDrinkTime(item._i, t)} />
            <span style={{ fontSize: 12, color: '#767676', display: 'flex', alignItems: 'center', gap: 3 }}>· <Icon name="beer" size={15} color="#767676" /> Drink</span>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontWeight: 700, color: '#111111', fontSize: 18, lineHeight: 1 }}>{((item as DrinkItem).units || 0).toFixed(1)}u</div>
            <div style={{ fontSize: 12, color: '#767676', marginTop: 1 }}>units</div>
          </div>
          <button onClick={() => removeDrink(item._i)} style={{ background: 'none', border: 'none', color: '#999999', fontSize: 18, lineHeight: 1, padding: '0 2px', marginTop: 2 }}>×</button>
        </div>
      </div>
    </div>
  )

  return (
    <Section title="FOOD & DRINK" accent="#9ebd6e">
      {totalCals > 0 && <FoodSummaryHeader foodItems={foodItems} totalCals={totalCals} />}

      <input id="nourish-camera" type="file" accept="image/*" capture="environment" style={{ display: 'none' }}
        onChange={e => { void handleImage(e.target.files?.[0]); e.target.value = '' }} />
      <input id="nourish-gallery" type="file" accept="image/*" style={{ display: 'none' }}
        onChange={e => { void handleImage(e.target.files?.[0]); e.target.value = '' }} />
      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        <label htmlFor="nourish-camera" style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 5, padding: '12px 8px', borderRadius: 10, border: '1.5px solid #efefef', background: '#f9f9f9', color: '#767676', fontSize: 12, fontFamily: 'inherit', userSelect: 'none', fontWeight: 500, cursor: 'pointer' }}>
          <Icon name="camera" size={22} color="#767676" /><span>Camera</span>
        </label>
        <label htmlFor="nourish-gallery" style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 5, padding: '12px 8px', borderRadius: 10, border: '1.5px solid #efefef', background: '#f9f9f9', color: '#767676', fontSize: 12, fontFamily: 'inherit', userSelect: 'none', fontWeight: 500, cursor: 'pointer' }}>
          <Icon name="gallery" size={22} color="#767676" /><span>Gallery</span>
        </label>
        <button onClick={() => setShowFavs(v => !v)}
          style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 5, padding: '12px 8px', borderRadius: 10, border: showFavs || selectedFavs.length > 0 ? '1.5px solid #9ebd6e' : '1.5px solid #efefef', background: showFavs || selectedFavs.length > 0 ? '#f5f5f5' : '#f9f9f9', color: showFavs || selectedFavs.length > 0 ? '#9ebd6e' : '#767676', fontSize: 12, fontFamily: 'inherit', fontWeight: 500, cursor: 'pointer' }}>
          {selectedFavs.length > 0
            ? <><Icon name="star" size={22} color="#9ebd6e" /><span>{selectedFavs.length} selected</span></>
            : <><Icon name="star" size={22} color={showFavs ? '#9ebd6e' : '#767676'} /><span>Saved</span></>}
        </button>
      </div>

      {imageLoading && <div style={{ marginBottom: 10 }}><Spinner label="Identifying…" /></div>}
      {previewSrc && !imageLoading && (
        <div style={{ marginBottom: 10, display: 'flex', gap: 10, alignItems: 'flex-start' }}>
          <img src={previewSrc} alt="item" style={{ width: 72, height: 72, objectFit: 'cover', borderRadius: 10, border: '1.5px solid #efefef', flexShrink: 0 }} />
          <div style={{ fontSize: 12, color: '#767676', lineHeight: 1.5, paddingTop: 2 }}>Identified — edit below if needed, then tap Analyse.</div>
        </div>
      )}

      {favourites.length > 0 && (
        <div style={{ marginBottom: 8, position: 'relative' }}>
          {showFavs && (
            <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 20, background: '#fff', border: '1.5px solid #efefef', borderRadius: 10, boxShadow: '0 4px 16px rgba(0,0,0,0.08)', marginTop: 4, maxHeight: 260, overflowY: 'auto' }}>
              {favourites.map((fav, i) => {
                const key = fav.name || fav.text
                const checked = selectedFavs.includes(key)
                return (
                  <div key={i} onClick={() => toggleFavSelection(key)}
                    style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 14px', cursor: 'pointer', background: checked ? '#f5f5f5' : 'none', borderBottom: i < favourites.length - 1 ? '1px solid #f5f5f5' : 'none' }}>
                    <div style={{ width: 20, height: 20, borderRadius: 5, border: '2px solid ' + (checked ? '#9ebd6e' : '#e0e0e0'), background: checked ? '#9ebd6e' : '#fff', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {checked && <span style={{ color: '#fff', fontSize: 13, lineHeight: 1, fontWeight: 700 }}>✓</span>}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 14, color: '#111111', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{fav.name || fav.text}</div>
                      {fav.name && fav.text !== fav.name && <div style={{ fontSize: 11, color: '#aaaaaa', marginTop: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{fav.text}</div>}
                    </div>
                    <span style={{ fontSize: 12, color: '#767676', flexShrink: 0 }}>{fav.calories ? fav.calories + ' kcal' : '—'}</span>
                  </div>
                )
              })}
              {selectedFavs.length > 0 && (
                <div style={{ padding: '10px 14px', borderTop: '1.5px solid #efefef', background: '#f9f9f9' }}>
                  <button onClick={addSelectedFavourites} style={{ width: '100%', padding: '10px', background: '#9ebd6e', color: '#fff', border: 'none', borderRadius: 8, fontSize: 14, fontFamily: 'inherit', fontWeight: 700, cursor: 'pointer' }}>
                    {'+ Add ' + selectedFavs.length + ' item' + (selectedFavs.length > 1 ? 's' : '') + ' to log'}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      <textarea ref={textareaRef} placeholder="What did you eat or drink? Be specific for best accuracy…" value={text} onChange={e => setText(e.target.value)}
        style={{ width: '100%', minHeight: 46, padding: '12px 14px', borderRadius: 12, border: '1.5px solid #efefef', background: '#fff', fontFamily: 'inherit', fontSize: 14, color: '#111111', resize: 'none', outline: 'none', lineHeight: 1.5 }} />
      {error && <div style={{ fontSize: 12, color: '#e8457a', marginTop: 6 }}>{error}</div>}

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 8 }}>
        <AnalyseBtn onClick={() => void analyse()} disabled={!text.trim() || loading}>Analyse</AnalyseBtn>
        {(text.trim() || isPending) && (
          <button onClick={() => { setText(''); setPending(null); setPendingDrink(null); setPreviewSrc(null); setError(''); setShowFavNameInput(false) }}
            style={{ padding: '10px 18px', background: 'none', border: '1.5px solid #efefef', borderRadius: 24, fontSize: 14, fontFamily: 'inherit', fontWeight: 600, color: '#767676', cursor: 'pointer' }}>
            Clear
          </button>
        )}
        {isPending && !pending?._multiSummary && <AnalyseBtn onClick={addItem} color="#6a9e6a">✓ Add to log</AnalyseBtn>}
        {isPending && !pending?._multiSummary && pending?.text && !favSaved && !favourites.find(f => (f.name || f.text) === pending.text) && (
          <AnalyseBtn onClick={openSaveFav} color="#767676"><Icon name="star" size={15} color="#fff" /> Save</AnalyseBtn>
        )}
        {favSaved && <span style={{ fontSize: 13, color: '#6a9e6a', display: 'flex', alignItems: 'center', gap: 4, padding: '10px 0' }}><Icon name="check" size={15} color="#6a9e6a" /> Saved to favourites</span>}
      </div>

      {showFavNameInput && (
        <div style={{ marginTop: 10, padding: '12px 14px', background: '#f9f9f9', borderRadius: 12, border: '1.5px solid #efefef' }}>
          <div style={{ fontSize: 12, color: '#767676', marginBottom: 6 }}>Give this a name for your favourites (or leave blank to use the full description)</div>
          <div style={{ display: 'flex', gap: 8 }}>
            <input autoFocus value={savingFavName} onChange={e => setSavingFavName(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') confirmSaveFav(); if (e.key === 'Escape') setShowFavNameInput(false) }}
              placeholder={`e.g. "Spinach smoothie"`}
              style={{ flex: 1, padding: '9px 12px', borderRadius: 10, border: '1.5px solid #efefef', background: '#fff', fontFamily: 'inherit', fontSize: 14, color: '#111111', outline: 'none' }} />
            <button onClick={confirmSaveFav} style={{ padding: '9px 16px', background: '#9ebd6e', color: '#fff', border: 'none', borderRadius: 10, fontSize: 14, fontFamily: 'inherit', fontWeight: 700, cursor: 'pointer' }}>Save</button>
            <button onClick={() => setShowFavNameInput(false)} style={{ padding: '9px 12px', background: 'none', border: '1.5px solid #efefef', borderRadius: 10, fontSize: 14, fontFamily: 'inherit', color: '#767676', cursor: 'pointer' }}>✕</button>
          </div>
        </div>
      )}
      {loading && <div style={{ marginTop: 10 }}><Spinner /></div>}

      {isPending && (
        <div style={{ marginTop: 12 }}>
          {!pending?._multiSummary && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
              <span style={{ fontSize: 12, color: '#767676', fontWeight: 600 }}>Time:</span>
              <HourSelect value={pendingTime} onChange={setPendingTime} />
            </div>
          )}
          {pending?._multiSummary && (
            <div style={{ padding: '10px 12px', background: '#f0fdf5', borderRadius: 10, border: '1.5px solid #6a9e6a33', marginBottom: 10, fontSize: 13, color: '#111111' }}>
              <div style={{ fontWeight: 700, color: '#111111', marginBottom: 4 }}>✓ {pending.calories} kcal logged across multiple entries</div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
                {[{ label: 'Protein', value: pending.protein_g, unit: 'g', color: '#111111' }, { label: 'Carbs', value: pending.carbs_g, unit: 'g', color: '#111111' }, { label: 'Fat', value: pending.fat_g, unit: 'g', color: '#111111' }].map(s => (
                  <div key={s.label} style={{ textAlign: 'center', padding: '4px 10px', background: '#f9f9f9', borderRadius: 8, border: `1.5px solid ${s.color}33` }}>
                    <div style={{ fontSize: 15, fontWeight: 700, color: s.color }}>{s.value}g</div>
                    <div style={{ fontSize: 12, color: '#767676' }}>{s.label}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
          {pending && !pending._multiSummary && (
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 10 }}>
              {[{ label: 'Calories', value: pending.calories, unit: 'kcal', color: '#111111' }, { label: 'Protein', value: pending.protein_g, unit: 'g', color: '#111111' }, { label: 'Carbs', value: pending.carbs_g, unit: 'g', color: '#111111' }, { label: 'Fat', value: pending.fat_g, unit: 'g', color: '#111111' }].map(s => (
                <div key={s.label} style={{ flex: '1 1 70px', textAlign: 'center', padding: '8px 6px', background: '#f9f9f9', borderRadius: 10, border: `1.5px solid ${s.color}33` }}>
                  <div style={{ fontSize: 18, fontWeight: 700, color: s.color }}>{s.value}</div>
                  <div style={{ fontSize: 12, color: '#767676', letterSpacing: 0.5 }}>{s.unit} {s.label}</div>
                </div>
              ))}
            </div>
          )}
          {pendingDrink && (
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '8px 14px', background: '#f5f5f5', borderRadius: 10, border: '1.5px solid #9ebd6e33', marginBottom: 10 }}>
              <span style={{ display: 'flex', alignItems: 'center' }}><Icon name="beer" size={20} color="#9ebd6e" /></span>
              <div>
                <div style={{ fontWeight: 700, color: '#111111', fontSize: 16 }}>{pendingDrink.units} units</div>
                <div style={{ fontSize: 12, color: '#767676' }}>{pendingDrink.drink_type}{pendingDrink.abv ? ` · ${pendingDrink.abv}% ABV` : ''}{pendingDrink.volume_ml ? ` · ${pendingDrink.volume_ml}ml` : ''}</div>
              </div>
            </div>
          )}
          <AIBubble text={(pending ?? pendingDrink)?.commentary} />
          {chatCtx && <ChatWidget systemPrompt={`You are a friendly nutritionist and health coach. Today: ${dayContext}. Answer follow-up questions about this food or drink. British English.`} contextSummary={chatCtx} placeholder="e.g. How many units is that this week? What could I eat instead?" />}
        </div>
      )}

      {allItems.length > 0 && (
        <div style={{ marginTop: 14, borderTop: '1px solid #efefef', paddingTop: 10 }}>
          {allItems.length > 3 && (
            <div style={{ marginBottom: 4 }}>
              <button onClick={() => setShowAllItems(v => !v)}
                style={{ display: 'flex', alignItems: 'center', gap: 6, width: '100%', background: 'none', border: 'none', padding: '6px 0', fontFamily: 'inherit', cursor: 'pointer', color: '#767676', fontSize: 12, fontWeight: 600 }}>
                <Icon name={showAllItems ? 'chevup' : 'chevdown'} size={14} color="#767676" />
                {showAllItems ? 'Hide older items' : `Show ${allItems.length - 3} older item${allItems.length - 3 > 1 ? 's' : ''}`}
              </button>
              {showAllItems && allItems.slice(0, allItems.length - 3).map((item, idx) => renderLogItem(item, idx, 'older'))}
            </div>
          )}
          {allItems.slice(-3).map((item, idx) => renderLogItem(item, idx, 'recent'))}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 10, marginTop: 4 }}>
            <span style={{ fontSize: 13, color: '#767676' }}>Total</span>
            <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
              {totalUnits > 0 && <span style={{ fontSize: 13, color: '#111111', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}><Icon name="beer" size={15} color="#9ebd6e" />{totalUnits.toFixed(1)} units</span>}
              <span style={{ fontSize: 18, fontWeight: 700, color: '#111111' }}>{totalCals} <span style={{ fontSize: 12, fontWeight: 400, color: '#767676' }}>kcal</span></span>
            </div>
          </div>
          <button onClick={() => { setText(''); setPending(null); setPendingDrink(null); setPreviewSrc(null) }}
            style={{ width: '100%', marginTop: 12, padding: '10px', background: 'none', border: '1.5px dashed #dddddd', borderRadius: 10, color: '#767676', fontSize: 13, fontFamily: 'inherit', fontWeight: 500, cursor: 'pointer' }}>
            + Log another item
          </button>
        </div>
      )}
    </Section>
  )
}
