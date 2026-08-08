import { useState } from 'react'
import { useNavigate } from 'react-router'
import { useQueryClient } from '@tanstack/react-query'
import { ApiError } from '../api/client'
import { analyzeMeal, saveMeal } from '../api/meal'
import type { MealSource, MealType } from '../api/meal'
import { resizeImage } from '../features/meal/imageResize'
import {
  MEAL_TYPE_LABELS,
  defaultMealType,
  validateNutrition,
} from '../features/meal/mealDefaults'
import type { NutritionErrors } from '../features/meal/mealDefaults'
import { toNumber } from '../api/memberValidation'
import { Button, Card, Field, Select, TextInput } from '../ui/form'

type Step = 'input' | 'analyzing' | 'confirm'

/** 식사 기록: ① 사진 선택 or 직접 입력 → ② (사진이면) 분석 → ③ 확인·수정 → 저장 */
export function MealRecordPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const [step, setStep] = useState<Step>('input')
  const [source, setSource] = useState<MealSource>('MANUAL')
  const [mealType, setMealType] = useState<MealType>(() => defaultMealType(new Date()))
  const [kcal, setKcal] = useState('')
  const [carb, setCarb] = useState('')
  const [protein, setProtein] = useState('')
  const [fat, setFat] = useState('')
  const [errors, setErrors] = useState<NutritionErrors>({})
  const [notice, setNotice] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function onPickPhoto(file: File) {
    setNotice(null)
    setStep('analyzing')
    try {
      const resized = await resizeImage(file)
      const result = await analyzeMeal(resized)
      if (result.foodFound) {
        setSource('AI')
        setKcal(String(result.totalKcal))
        setCarb(String(result.carbG))
        setProtein(String(result.proteinG))
        setFat(String(result.fatG))
      } else {
        setSource('MANUAL')
        setNotice(result.notes || '음식을 찾지 못했어요. 직접 입력해주세요.')
      }
    } catch (error) {
      // 분석 실패(502·429 등) → 수동 입력 폴백
      setSource('MANUAL')
      setNotice(
        error instanceof ApiError && error.status === 429
          ? '오늘 분석 횟수를 초과했어요. 직접 입력해주세요.'
          : '사진 분석에 실패했어요. 직접 입력해주세요.',
      )
    }
    setStep('confirm')
  }

  function startManual() {
    setSource('MANUAL')
    setNotice(null)
    setStep('confirm')
  }

  async function save() {
    const values = {
      totalKcal: toNumber(kcal),
      carbG: toNumber(carb),
      proteinG: toNumber(protein),
      fatG: toNumber(fat),
    }
    const fieldErrors = validateNutrition(values)
    setErrors(fieldErrors)
    if (Object.keys(fieldErrors).length > 0) return

    setBusy(true)
    try {
      await saveMeal({
        eatenAt: new Date().toISOString(),
        mealType,
        source,
        totalKcal: values.totalKcal!,
        carbG: values.carbG!,
        proteinG: values.proteinG!,
        fatG: values.fatG!,
      })
      await queryClient.invalidateQueries({ queryKey: ['meals'] })
      navigate('/')
    } catch {
      setNotice('저장에 실패했어요. 잠시 후 다시 시도해주세요.')
      setBusy(false)
    }
  }

  return (
    <section>
      <h1 className="text-xl font-semibold">식사 기록</h1>

      {step === 'input' && (
        <Card className="mt-4">
          <p className="mb-4 text-muted">사진을 찍으면 AI가 칼로리를 추정해요.</p>
          <label className="mb-3 block w-full cursor-pointer rounded-md bg-brand py-3 text-center font-medium text-on-brand">
            사진 촬영·선택
            <input
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (file) void onPickPhoto(file)
              }}
            />
          </label>
          <Button type="button" variant="secondary" onClick={startManual} className="w-full">
            직접 입력
          </Button>
        </Card>
      )}

      {step === 'analyzing' && (
        <Card className="mt-4">
          <p className="text-center text-muted">사진을 분석하고 있어요…</p>
        </Card>
      )}

      {step === 'confirm' && (
        <Card className="mt-4">
          {notice && (
            <p role="status" className="mb-3 text-sm text-muted">
              {notice}
            </p>
          )}
          {source === 'AI' && (
            <p className="mb-3 text-sm text-brand">AI 추정값이에요. 확인하고 수정할 수 있어요.</p>
          )}

          <Field id="mealType" label="끼니">
            <Select id="mealType" value={mealType} onChange={(e) => setMealType(e.target.value as MealType)}>
              {Object.entries(MEAL_TYPE_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </Select>
          </Field>

          <Field id="kcal" label="칼로리 (kcal)" error={errors.totalKcal}>
            <TextInput id="kcal" inputMode="numeric" value={kcal} onChange={(e) => setKcal(e.target.value)} />
          </Field>
          <Field id="carb" label="탄수화물 (g)" error={errors.carbG}>
            <TextInput id="carb" inputMode="decimal" value={carb} onChange={(e) => setCarb(e.target.value)} />
          </Field>
          <Field id="protein" label="단백질 (g)" error={errors.proteinG}>
            <TextInput id="protein" inputMode="decimal" value={protein} onChange={(e) => setProtein(e.target.value)} />
          </Field>
          <Field id="fat" label="지방 (g)" error={errors.fatG}>
            <TextInput id="fat" inputMode="decimal" value={fat} onChange={(e) => setFat(e.target.value)} />
          </Field>

          <Button type="button" onClick={save} disabled={busy} className="w-full">
            저장
          </Button>
        </Card>
      )}
    </section>
  )
}
