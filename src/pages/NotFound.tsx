import React from 'react'
import { Link } from 'react-router-dom'
import { Compass, ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[#FAF7F0] flex items-center justify-center px-4">
      <div className="paper-card p-10 max-w-md w-full text-center fade-rise">
        <div className="w-16 h-16 rounded-2xl bg-[#12294B] flex items-center justify-center mx-auto mb-5 shadow-sm">
          <Compass className="w-8 h-8 text-[#E8A33D]" />
        </div>
        <span className="font-serif text-5xl font-bold text-[#1D4ED8]">404</span>
        <h1 className="font-serif text-2xl font-semibold text-[#23201A] mt-2 mb-2">
          Página não encontrada
        </h1>
        <p className="text-sm text-[#6E6A5E] mb-6 leading-relaxed">
          O caminho solicitado não existe ou você não possui autorização para acessá-lo.
        </p>
        <Link to="/">
          <Button className="w-full h-11 rounded-xl bg-[#16418F] hover:bg-[#0F2C61] text-white font-medium">
            <ArrowLeft className="w-4 h-4 mr-2" /> Voltar ao Resumo
          </Button>
        </Link>
      </div>
    </div>
  )
}
