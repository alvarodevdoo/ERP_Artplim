import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Eye, EyeOff, Loader2, Key } from 'lucide-react'
import { toast } from 'sonner'

import { useAuthStore } from '@/stores/auth'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'

const loginSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'Senha deve ter pelo menos 6 caracteres'),
})

type LoginFormData = z.infer<typeof loginSchema>

export function LoginPage() {
  const [showPassword, setShowPassword] = useState(false)
  const { login } = useAuthStore()
  
  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  })

  // Função para preencher automaticamente as credenciais de desenvolvimento
  const fillDevelopmentCredentials = () => {
    setValue('email', 'admin@artplim.com.br')
    setValue('password', 'admin123')
    toast.info('Credenciais de desenvolvimento preenchidas!')
  }

  const onSubmit = async (data: LoginFormData) => {
    try {
      await login(data.email, data.password)
      toast.success('Login realizado com sucesso!')
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Erro ao fazer login')
    }
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900">Entrar</h2>
        <p className="mt-2 text-sm text-gray-600">
          Acesse sua conta para continuar
        </p>
      </div>

      {/* Credenciais de Desenvolvimento */}
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
        <div className="flex items-center mb-3">
          <Key className="w-5 h-5 text-yellow-600 mr-2" />
          <h3 className="text-sm font-semibold text-yellow-800">Credenciais de Desenvolvimento</h3>
        </div>
        <div className="text-xs text-yellow-700 space-y-1 mb-3">
          <p><strong>Email:</strong> admin@artplim.com.br</p>
          <p><strong>Senha:</strong> admin123</p>
        </div>
        <button
          type="button"
          onClick={fillDevelopmentCredentials}
          className="w-full bg-yellow-100 hover:bg-yellow-200 text-yellow-800 px-3 py-2 rounded text-xs font-medium transition-colors duration-200 border border-yellow-300"
        >
          Preencher Automaticamente
        </button>
        <p className="text-xs text-yellow-600 mt-2 text-center">
          ⚠️ Apenas para ambiente de desenvolvimento
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            placeholder="seu@email.com"
            {...register('email')}
            error={errors.email?.message}
          />
        </div>

        <div>
          <Label htmlFor="password">Senha</Label>
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? 'text' : 'password'}
              placeholder="Sua senha"
              {...register('password')}
              error={errors.password?.message}
            />
            <button
              type="button"
              className="absolute inset-y-0 right-0 pr-3 flex items-center"
              onClick={() => setShowPassword(!showPassword)}
            >
              {showPassword ? (
                <EyeOff className="h-4 w-4 text-gray-400" />
              ) : (
                <Eye className="h-4 w-4 text-gray-400" />
              )}
            </button>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <input
              id="remember-me"
              name="remember-me"
              type="checkbox"
              className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
            />
            <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-900">
              Lembrar de mim
            </label>
          </div>

          <div className="text-sm">
            <Link
              to="/auth/forgot-password"
              className="font-medium text-primary hover:text-primary/80"
            >
              Esqueceu a senha?
            </Link>
          </div>
        </div>

        <Button
          type="submit"
          className="w-full"
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Entrando...
            </>
          ) : (
            'Entrar'
          )}
        </Button>
      </form>

      <div className="text-center">
        <p className="text-sm text-gray-600">
          Não tem uma conta?{' '}
          <Link
            to="/auth/register"
            className="font-medium text-primary hover:text-primary/80"
          >
            Cadastre-se
          </Link>
        </p>
      </div>
    </div>
  )
}