import Modal from './Modal'
import Button, { SecondaryButton } from './Button'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'

const V2_PROMO_DISMISSED_KEY = 'v2-promo-dismissed'

const TermsPopupModal = () => {
  const [openModal, setOpenModal] = useState(true)
  const [isClient, setIsClient] = useState(false)
  const router = useRouter()

  useEffect(() => {
    setIsClient(true)
  }, [])

  useEffect(() => {
    if (localStorage) {
      const isTermAccepted =
        typeof window !== 'undefined'
          ? localStorage.getItem('accept-terms') === 'true'
          : false

      if (isTermAccepted) {
        setOpenModal(false)
      }
    }
  })

  const acceptAndGoToV2 = () => {
    localStorage.setItem('accept-terms', 'true')
    localStorage.setItem(V2_PROMO_DISMISSED_KEY, 'true')
    window.open('https://v2.realms.today', '_blank')
    setOpenModal(false)
  }

  const acceptAndStay = () => {
    localStorage.setItem('accept-terms', 'true')
    localStorage.setItem(V2_PROMO_DISMISSED_KEY, 'true')
    setOpenModal(false)
  }

  const rejectTerms = () => {
    localStorage.setItem('accept-terms', 'false')
    router.push('https://realms.today?terms=rejected')
  }

  return (
    <>
      {isClient && openModal ? (
        <Modal
          isOpen={openModal && isClient}
          onClose={() => setOpenModal(false)}
          bgClickClose={false}
          hideClose={true}
          sizeClassName="sm:max-w-lg"
        >
          {/* V2 Promo Section */}
          <div className="text-center mb-6 pb-6 border-b border-bkg-4">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-gradient-to-br from-[#7c3aed] to-[#6366f1] mb-3">
              <svg
                className="w-7 h-7 text-white"
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
            <h2 className="text-xl font-bold text-fgd-1 mb-1">
              Realms v2 is here
            </h2>
            <p className="text-fgd-3 text-sm mb-3">
              Faster, sharper, and built for you
            </p>
            <div className="flex flex-wrap justify-center gap-2">
              <div className="inline-flex items-center gap-2 text-sm text-green-400 bg-green-400/10 px-3 py-1.5 rounded-full">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                Treasury prices now available
              </div>
              <div className="inline-flex items-center gap-2 text-sm text-green-400 bg-green-400/10 px-3 py-1.5 rounded-full">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                All DAOs are there
              </div>
            </div>
          </div>

          {/* Terms Section */}
          <div className="mb-6">
            <h3 className="text-sm font-semibold text-fgd-2 mb-2">Terms & Privacy Policy</h3>
            <p className="text-sm text-fgd-3 text-justify">
              The operating entity of this site and owner of the related
              intellectual property has changed. The new operator is Realms Today
              Ltd. (the New Operator). We have accordingly amended the Terms and
              the Private Policy governing the relationship between our users and
              the New Operator. By clicking &quot;accept&quot;, you represent and warrant
              that you agree to the revised Terms and Private Policy.
            </p>
          </div>

          {/* CTA Buttons */}
          <div className="space-y-3">
            <Button
              className="w-full bg-gradient-to-r from-[#7c3aed] to-[#6366f1] hover:from-[#6d31d4] hover:to-[#5558e0]"
              onClick={acceptAndGoToV2}
            >
              <span className="flex items-center justify-center gap-2 text-white">
                Accept & Try Realms v2
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </span>
            </Button>
            <div className="flex gap-3">
              <SecondaryButton
                className="flex-1"
                onClick={acceptAndStay}
              >
                Accept & Stay on v1
              </SecondaryButton>
              <SecondaryButton
                className="flex-1 !text-red-400 hover:!text-red-300"
                onClick={rejectTerms}
              >
                Reject
              </SecondaryButton>
            </div>
          </div>
        </Modal>
      ) : null}
    </>
  )
}

export default TermsPopupModal
