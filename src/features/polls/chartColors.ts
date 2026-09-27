/** Categorical order for pie slices (validated reference palette, light surface). */
export const CATEGORICAL = ['#2a78d6', '#eb6834', '#1baf7a', '#eda100', '#e87ba4', '#008300', '#4a3aa7', '#e34948']

/** At most 8 slices: anything past the 7th folds into "Other" (never a generated 9th hue). */
export function pieSlices(data: { label: string; value: number }[]) {
  if (data.length <= CATEGORICAL.length) return data
  const head = data.slice(0, CATEGORICAL.length - 1)
  const rest = data.slice(CATEGORICAL.length - 1).reduce((s, d) => s + d.value, 0)
  return [...head, { label: 'Other', value: rest }]
}
