import Button from "@components/Button";
import { BN } from "@coral-xyz/anchor";
import { useAddTokens } from "TokenVoterPlugin/hooks/useAddTokens";

export default function DepositButton(
  {showDeposit, setPower}: 
  {
    showDeposit: boolean | null | undefined,
    setPower: (b: BN) => void
  }
) {
  const {mutateAsync: addTokensFn} = useAddTokens()

  async function handleClick() {
    const power = await addTokensFn()

    if (power) {
      setPower(power)
    }
  }

  return (
    <Button
      className="sm:w-1/2 max-w-[200px]"
      disabled={!showDeposit}
      tooltipMessage={!showDeposit ? "You dont have tokens to deposit" : ""}
      onClick={handleClick}
    >
      Deposit
    </Button>
  )
}