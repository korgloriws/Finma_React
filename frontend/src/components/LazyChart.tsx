import { lazy, Suspense } from 'react'
import LoadingSpinner from './LoadingSpinner'

// Lazy loading dos componentes de gráfico mais pesados
const LazyAreaChart = lazy(() => import('recharts').then(module => ({ default: module.AreaChart })))
const LazyBarChart = lazy(() => import('recharts').then(module => ({ default: module.BarChart })))
const LazyPieChart = lazy(() => import('recharts').then(module => ({ default: module.PieChart })))
const LazyLineChart = lazy(() => import('recharts').then(module => ({ default: module.LineChart })))
const LazyComposedChart = lazy(() => import('recharts').then(module => ({ default: module.ComposedChart })))

// Componentes que são sempre necessários (leves)
export { 
  Area, 
  Bar, 
  Pie, 
  Cell, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Legend,
  Label,
  Line
} from 'recharts'

// Componentes pesados com lazy loading
export const AreaChart = (props: any) => (
  <Suspense fallback={<LoadingSpinner text="Carregando gráfico..." />}>
    <LazyAreaChart {...props} />
  </Suspense>
)

export const BarChart = (props: any) => (
  <Suspense fallback={<LoadingSpinner text="Carregando gráfico..." />}>
    <LazyBarChart {...props} />
  </Suspense>
)

export const PieChart = (props: any) => (
  <Suspense fallback={<LoadingSpinner text="Carregando gráfico..." />}>
    <LazyPieChart {...props} />
  </Suspense>
)

export const LineChart = (props: any) => (
  <Suspense fallback={<LoadingSpinner text="Carregando gráfico..." />}>
    <LazyLineChart {...props} />
  </Suspense>
)

export const ComposedChart = (props: any) => (
  <Suspense fallback={<LoadingSpinner text="Carregando gráfico..." />}>
    <LazyComposedChart {...props} />
  </Suspense>
)
