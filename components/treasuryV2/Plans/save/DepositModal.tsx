import Button from "@components/Button"
import Input from "@components/inputs/Input"
import Loading from "@components/Loading"
import Modal from "@components/Modal"
import Tooltip from "@components/Tooltip"
import BigNumber from "bignumber.js"
import { useState } from "react"
import { MergedPlan } from "@components/TreasuryAccount/DefiCard"
import { AccountTypeToken } from "@utils/uiTypes/assets"

const DepositModal = ({ isOpen, onClose, plan }: { isOpen: boolean, onClose: () => void, plan: MergedPlan }) => {
  const [formErrors, setFormErrors] = useState({})
  const [isDepositing, setIsDepositing] = useState(false)
  const [amount, setAmount] = useState<string | undefined>(undefined)
  const mintMinAmount = new BigNumber(1).shiftedBy(plan.assets[0].decimals).toNumber()

  async function handleDeposit() {
    if(!plan.account?.governance.nativeTreasuryAddress) return;
    setIsDepositing(true)
    await plan.deposit(Number(amount), plan.account?.governance.nativeTreasuryAddress)
    setIsDepositing(false)
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <div>Deposit</div>

      <div className="flex flex-col gap-2">
      <Input
        error={formErrors['amount']}
        min={mintMinAmount}
        value={amount}
        type="number"
        onChange={(e) =>
          setAmount(e.target.value)
        }
        step={mintMinAmount}
      />
      <div className="flex justify-between">
        <span className="text-fgd-3">Current Deposits</span>
        <span className="font-bold text-fgd-1">
          {plan.amount?.toFixed(4) || 0}{' '}
          <span className="font-normal text-fgd-3">{plan.assets[0].symbol}</span>
        </span>
      </div>
      <div className="flex justify-between">
        <span className="text-fgd-3">APR</span>
        <span className="font-bold text-fgd-1">
          {plan.apr}{' '}
          <span className="font-normal text-fgd-3">%</span>
        </span>
      </div>
      <Button
        className="w-full"
        onClick={handleDeposit}
        disabled={!amount ||  isDepositing}
      >
        <Tooltip
          content={
            !amount
              ? 'Please input the amount'
              : ''
          }
        >
          {!isDepositing ? 'Deposit' : <Loading/>}
        </Tooltip>
      </Button>
      </div>
    </Modal>
  )
}

export default DepositModal