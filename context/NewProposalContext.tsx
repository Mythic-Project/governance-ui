import { createContext, useState, ReactNode, useCallback } from 'react'
import { UiInstruction } from '@utils/uiTypes/proposalCreationTypes'

interface NewProposalContextType {
    handleSetInstructions: (instruction: {
        governedAccount?: any;
        getInstruction: () => Promise<UiInstruction>
    }, index: () => Promise<UiInstruction>) => void
    instructions: Record<number, { governedAccount?: any; getInstruction: () => Promise<UiInstruction> }>
}

export const NewProposalContext = createContext<NewProposalContextType>({
    handleSetInstructions: () => {
        console.warn('handleSetInstructions called outside of provider')
    },
    instructions: {},
})

interface NewProposalProviderProps {
    children: ReactNode
}

export const NewProposalProvider = ({ children }: NewProposalProviderProps) => {
    const [instructions, setInstructions] = useState<NewProposalContextType['instructions']>({})

    const handleSetInstructions = useCallback(
        (instruction: { governedAccount?: any; getInstruction: () => Promise<UiInstruction> }, index: number) => {
            setInstructions(prev => ({
                ...prev,
                [index]: instruction,
            }))
        },
        []
    )

    return (
        <NewProposalContext.Provider value={{ handleSetInstructions, instructions }}>
            {children}
        </NewProposalContext.Provider>
    )
}
