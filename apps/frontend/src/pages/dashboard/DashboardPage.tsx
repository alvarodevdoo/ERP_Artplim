import { useEffect, useState } from 'react'
import { 
  TrendingUp, 
  TrendingDown, 
  Package, 
  FileText, 
  Wrench, 
  DollarSign,
  Users,
  AlertTriangle
} from 'lucide-react'

import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'

interface DashboardStats {
  totalProducts: number
  totalQuotes: number
  totalOrders: number
  totalRevenue: number
  lowStockItems: number
  pendingOrders: number
  monthlyGrowth: number
  activeCustomers: number
}

export function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats>({
    totalProducts: 0,
    totalQuotes: 0,
    totalOrders: 0,
    totalRevenue: 0,
    lowStockItems: 0,
    pendingOrders: 0,
    monthlyGrowth: 0,
    activeCustomers: 0,
  })

  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Simular carregamento de dados
    setTimeout(() => {
      setStats({
        totalProducts: 156,
        totalQuotes: 23,
        totalOrders: 45,
        totalRevenue: 125000,
        lowStockItems: 8,
        pendingOrders: 12,
        monthlyGrowth: 15.2,
        activeCustomers: 89,
      })
      setLoading(false)
    }, 1000)
  }, [])

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value)
  }

  const statCards = [
    {
      title: 'Produtos Cadastrados',
      value: stats.totalProducts,
      icon: Package,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
    },
    {
      title: 'Orçamentos Ativos',
      value: stats.totalQuotes,
      icon: FileText,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
    },
    {
      title: 'Ordens de Serviço',
      value: stats.totalOrders,
      icon: Wrench,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
    },
    {
      title: 'Faturamento Mensal',
      value: formatCurrency(stats.totalRevenue),
      icon: DollarSign,
      color: 'text-emerald-600',
      bgColor: 'bg-emerald-50',
    },
    {
      title: 'Clientes Ativos',
      value: stats.activeCustomers,
      icon: Users,
      color: 'text-indigo-600',
      bgColor: 'bg-indigo-50',
    },
    {
      title: 'Itens com Estoque Baixo',
      value: stats.lowStockItems,
      icon: AlertTriangle,
      color: 'text-red-600',
      bgColor: 'bg-red-50',
    },
  ]

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i} className="p-6">
              <div className="animate-pulse">
                <div className="flex items-center justify-between">
                  <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                  <div className="h-8 w-8 bg-gray-200 rounded"></div>
                </div>
                <div className="mt-4 h-8 bg-gray-200 rounded w-1/3"></div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600">Visão geral do seu negócio</p>
        </div>
        
        <div className="flex items-center space-x-2">
          <div className="flex items-center text-sm text-gray-600">
            <TrendingUp className="h-4 w-4 mr-1 text-green-600" />
            <span className="font-medium text-green-600">
              +{stats.monthlyGrowth}%
            </span>
            <span className="ml-1">este mês</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {statCards.map((card, index) => {
          const Icon = card.icon
          return (
            <Card key={index} className="p-6 hover:shadow-lg transition-shadow">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">
                    {card.title}
                  </p>
                  <p className="text-2xl font-bold text-gray-900 mt-2">
                    {card.value}
                  </p>
                </div>
                <div className={`p-3 rounded-lg ${card.bgColor}`}>
                  <Icon className={`h-6 w-6 ${card.color}`} />
                </div>
              </div>
            </Card>
          )
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">
              Ações Rápidas
            </h3>
          </div>
          <div className="space-y-3">
            <Button className="w-full justify-start" variant="outline">
              <Package className="mr-2 h-4 w-4" />
              Cadastrar Produto
            </Button>
            <Button className="w-full justify-start" variant="outline">
              <FileText className="mr-2 h-4 w-4" />
              Novo Orçamento
            </Button>
            <Button className="w-full justify-start" variant="outline">
              <Wrench className="mr-2 h-4 w-4" />
              Nova Ordem de Serviço
            </Button>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">
              Alertas
            </h3>
          </div>
          <div className="space-y-3">
            {stats.lowStockItems > 0 && (
              <div className="flex items-center p-3 bg-red-50 rounded-lg">
                <AlertTriangle className="h-5 w-5 text-red-600 mr-3" />
                <div>
                  <p className="text-sm font-medium text-red-800">
                    {stats.lowStockItems} itens com estoque baixo
                  </p>
                  <p className="text-xs text-red-600">
                    Verifique o estoque para evitar rupturas
                  </p>
                </div>
              </div>
            )}
            
            {stats.pendingOrders > 0 && (
              <div className="flex items-center p-3 bg-yellow-50 rounded-lg">
                <Wrench className="h-5 w-5 text-yellow-600 mr-3" />
                <div>
                  <p className="text-sm font-medium text-yellow-800">
                    {stats.pendingOrders} ordens pendentes
                  </p>
                  <p className="text-xs text-yellow-600">
                    Ordens aguardando processamento
                  </p>
                </div>
              </div>
            )}
            
            {stats.lowStockItems === 0 && stats.pendingOrders === 0 && (
              <div className="flex items-center p-3 bg-green-50 rounded-lg">
                <TrendingUp className="h-5 w-5 text-green-600 mr-3" />
                <div>
                  <p className="text-sm font-medium text-green-800">
                    Tudo funcionando perfeitamente!
                  </p>
                  <p className="text-xs text-green-600">
                    Nenhum alerta no momento
                  </p>
                </div>
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  )
}