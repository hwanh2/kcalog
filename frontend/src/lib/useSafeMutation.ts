import { useMutation } from '@tanstack/react-query'
import type { UseMutationOptions } from '@tanstack/react-query'
import { useState } from 'react'

const DEFAULT_MESSAGE = '요청에 실패했어요. 잠시 후 다시 시도해주세요.'

/**
 * 실패를 화면에 알리는 것을 **잊을 수 없게** 만든 `useMutation` 래퍼.
 *
 * 뮤테이션마다 `onError`를 손으로 붙이면 다음에 추가되는 것을 반드시 빠뜨린다
 * (실제로 14개 중 0개가 실패를 알리고 있었다). 여기서는 실패하면 항상 `error`에
 * 문구가 담기므로, 화면은 그것을 렌더하기만 하면 된다.
 *
 * ⚠️ 한계 — 화면이 `error`를 렌더하지 않으면 여전히 조용히 실패한다(design.md Risks).
 * 훅이 강제할 수 있는 것은 "메시지가 항상 만들어진다"까지다.
 *
 * QueryClient 전역 `onError`를 쓰지 않은 이유: 안내가 들어설 자리가 화면마다 달라
 * 전역에서 어디에 띄울지 결정할 수 없다.
 */
export function useSafeMutation<TData, TVariables>(
  mutationFn: (variables: TVariables) => Promise<TData>,
  options: {
    /** 실패했을 때 보여줄 문구. 없으면 기본 문구를 쓴다 */
    errorMessage?: string
    onSuccess?: (data: TData, variables: TVariables) => void
  } = {},
) {
  const [error, setError] = useState<string | null>(null)

  const mutation = useMutation<TData, unknown, TVariables>({
    mutationFn,
    onMutate: () => {
      // 재시도할 때 직전 실패 문구가 남아 있으면 결과를 오해한다
      setError(null)
    },
    onError: () => setError(options.errorMessage ?? DEFAULT_MESSAGE),
    onSuccess: (data, variables) => {
      setError(null)
      options.onSuccess?.(data, variables)
    },
  } as UseMutationOptions<TData, unknown, TVariables>)

  return {
    mutate: mutation.mutate,
    isPending: mutation.isPending,
    /** 실패 문구 — 화면이 이것을 `role="alert"`로 렌더한다 */
    error,
    clearError: () => setError(null),
  }
}
