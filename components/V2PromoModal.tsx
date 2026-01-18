import Modal from './Modal'
import Button, { SecondaryButton } from './Button'
import { useEffect, useState } from 'react'

const STORAGE_KEY = 'v2-promo-dismissed'

const V2PromoModal = () => {
  const [isOpen, setIsOpen] = useState(false)
  const [isClient, setIsClient] = useState(false)

  useEffect(() => {
    setIsClient(true)
  }, [])

  useEffect(() => {
    if (typeof window !== 'undefined' && localStorage) {
      const isDismissed = localStorage.getItem(STORAGE_KEY) === 'true'
      const hasAcceptedTerms = localStorage.getItem('accept-terms') === 'true'

      // Only show to existing users who already accepted terms
      // New users will see the combined Terms + V2 promo popup instead
      if (!isDismissed && hasAcceptedTerms) {
        // Small delay to not overwhelm user immediately
        const timer = setTimeout(() => setIsOpen(true), 1500)
        return () => clearTimeout(timer)
      }
    }
  }, [])

  const dismissModal = () => {
    localStorage.setItem(STORAGE_KEY, 'true')
    setIsOpen(false)
  }

  const goToV2 = () => {
    localStorage.setItem(STORAGE_KEY, 'true')
    window.open('https://v2.realms.today', '_blank')
    setIsOpen(false)
  }

  if (!isClient || !isOpen) return null

  return (
    <Modal
      isOpen={isOpen}
      onClose={dismissModal}
      sizeClassName="sm:max-w-lg"
      bgClickClose={true}
    >
      <div className="text-center">
        {/* Header with gradient */}
        <div className="mb-6">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-[#7c3aed] to-[#6366f1] mb-4">
            <svg
              className="w-8 h-8 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 10V3L4 14h7v7l9-11h-7z"
              />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-fgd-1 mb-2">
            Realms v2 is here
          </h2>
          <p className="text-fgd-3">
            Experience the next generation of DAO governance
          </p>
        </div>

        {/* Benefits list */}
        <div className="text-left space-y-3 mb-6">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 w-5 h-5 rounded-full bg-green-500/20 flex items-center justify-center mt-0.5">
              <svg className="w-3 h-3 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
            </div>
            <span className="text-fgd-2">Treasury prices now available</span>
          </div>
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 w-5 h-5 rounded-full bg-green-500/20 flex items-center justify-center mt-0.5">
              <svg className="w-3 h-3 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
            </div>
            <span className="text-fgd-2">All DAOs are there</span>
          </div>
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 w-5 h-5 rounded-full bg-green-500/20 flex items-center justify-center mt-0.5">
              <svg className="w-3 h-3 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
            </div>
            <span className="text-fgd-2">Faster performance and improved UX</span>
          </div>
        </div>

        {/* CTA buttons */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button
            className="w-full sm:w-auto bg-gradient-to-r from-[#7c3aed] to-[#6366f1] hover:from-[#6d31d4] hover:to-[#5558e0]"
            onClick={goToV2}
          >
            <span className="flex items-center justify-center gap-2 text-white">
              Go to Realms v2
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </span>
          </Button>
          <SecondaryButton
            className="w-full sm:w-auto"
            onClick={dismissModal}
          >
            Maybe later
          </SecondaryButton>
        </div>
      </div>
    </Modal>
  )
}

export default V2PromoModal
