import Button from "@components/Button";
import { BN } from "@coral-xyz/anchor";
import { useWithdrawTokens } from "TokenVoterPlugin/hooks/useWithdrawTokens";


export default function WithdrawButton(
  {showWithdraw, setPower}: 
  {
    showWithdraw: boolean | null | undefined,
    setPower: (b: BN) => void
  }
) {
  const {mutateAsync: withdrawTokensFn} = useWithdrawTokens()

  async function handleClick() {
    const power = await withdrawTokensFn()
    if (power) {
      setPower(power)
    }
  }

  return (
    <Button
      className="sm:w-1/2 max-w-[200px]" 
      disabled={!showWithdraw}
      tooltipMessage={!showWithdraw ? "You dont have tokens to withdraw" : ""}
      onClick={handleClick}
    >
      Withdraw
    </Button>
  )
}