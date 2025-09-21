import React from 'react'
import { useNavigate } from 'react-router-dom'
import DemoCharts from '../components/DemoCharts'
import { BarChart3, Users, Package, FileText, TrendingUp, Shield } from 'lucide-react'

const LandingPage: React.FC = () => {
  const navigate = useNavigate()

  const handleLoginClick = () => {
    navigate('/auth/login')
  }

  const features = [
    {
      icon: <BarChart3 className="w-8 h-8 text-blue-600" />,
      title: 'Dashboard Inteligente',
      description: 'Visualize seus dados de vendas, estoque e orçamentos em tempo real'
    },
    {
      icon: <Users className="w-8 h-8 text-green-600" />,
      title: 'Gestão de Clientes',
      description: 'Controle completo de clientes, fornecedores e parceiros'
    },
    {
      icon: <Package className="w-8 h-8 text-purple-600" />,
      title: 'Controle de Estoque',
      description: 'Gerencie insumos, produtos e acabamentos com precisão'
    },
    {
      icon: <FileText className="w-8 h-8 text-orange-600" />,
      title: 'Orçamentos Digitais',
      description: 'Crie e gerencie orçamentos de forma rápida e profissional'
    },
    {
      icon: <TrendingUp className="w-8 h-8 text-red-600" />,
      title: 'Relatórios Avançados',
      description: 'Análises detalhadas para tomada de decisões estratégicas'
    },
    {
      icon: <Shield className="w-8 h-8 text-indigo-600" />,
      title: 'Segurança LGPD',
      description: 'Proteção total dos dados conforme a Lei Geral de Proteção de Dados'
    }
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <h1 className="text-2xl font-bold text-gray-900">ArtPlim ERP</h1>
                <p className="text-sm text-gray-600">Sistema de Gestão para Gráficas</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={handleLoginClick}
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium transition-colors duration-200"
              >
                Entrar no Sistema
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6">
            Gerencie sua Gráfica com
            <span className="text-blue-600"> Inteligência</span>
          </h2>
          <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
            O ArtPlim ERP é a solução completa para gestão de gráficas, oferecendo controle total sobre 
            vendas, estoque, orçamentos e muito mais. Desenvolvido especialmente para o setor gráfico.
          </p>

          <button
            onClick={handleLoginClick}
            className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-lg font-medium text-lg transition-colors duration-200"
          >
            Começar Agora
          </button>
        </div>
      </section>

      {/* Dashboard Demo */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h3 className="text-3xl font-bold text-gray-900 mb-4">
              Dashboard em Tempo Real
            </h3>
            <p className="text-lg text-gray-600">
              Visualize dados importantes do seu negócio de forma clara e intuitiva
            </p>
          </div>
          
          <DemoCharts />
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h3 className="text-3xl font-bold text-gray-900 mb-4">
              Funcionalidades Principais
            </h3>
            <p className="text-lg text-gray-600">
              Tudo que você precisa para gerenciar sua gráfica de forma eficiente
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <div key={index} className="bg-white p-6 rounded-lg shadow-lg hover:shadow-xl transition-shadow duration-200">
                <div className="flex items-center mb-4">
                  {feature.icon}
                  <h4 className="text-xl font-semibold text-gray-900 ml-3">{feature.title}</h4>
                </div>
                <p className="text-gray-600">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div>
              <h4 className="text-xl font-bold mb-4">ArtPlim ERP</h4>
              <p className="text-gray-400">
                Sistema de gestão completo para gráficas, desenvolvido com as melhores práticas 
                de segurança e conformidade com a LGPD.
              </p>
            </div>
            <div>
              <h4 className="text-lg font-semibold mb-4">Funcionalidades</h4>
              <ul className="space-y-2 text-gray-400">
                <li>• Gestão de Vendas</li>
                <li>• Controle de Estoque</li>
                <li>• Orçamentos Digitais</li>
                <li>• Relatórios Avançados</li>
              </ul>
            </div>
            <div>
              <h4 className="text-lg font-semibold mb-4">Tecnologia</h4>
              <ul className="space-y-2 text-gray-400">
                <li>• React + TypeScript</li>
                <li>• Node.js + Express</li>
                <li>• PostgreSQL</li>
                <li>• Conformidade LGPD</li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-800 mt-8 pt-8 text-center text-gray-400">
            <p>&copy; 2024 ArtPlim ERP. Todos os direitos reservados.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}

export default LandingPage