import Button from '@components/Button'
import Input from '@components/inputs/Input'
import Textarea from '@components/inputs/Textarea'
import { useState } from 'react'

export default function DescriptionBox({
  callback,
  initTitle,
}: {
  callback: (title: string, description: string) => void
  initTitle: string
}) {
  const [title, setTitle] = useState(initTitle)
  const [description, setDescription] = useState('')

  return (
    <div>
      <Input
        className="my-4"
        type="text"
        placeholder="Title"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
      ></Input>
      <Textarea
        noMaxWidth={true}
        label="Description"
        placeholder={
          'Description of your proposal or use a github gist link (optional)'
        }
        wrapperClassName="mb-5"
        value={description}
        onChange={(evt) => setDescription(evt.target.value)}
      />
      <div className="flex">
        <Button
          className="ml-auto"
          onClick={() => callback(title, description)}
        >
          Propose
        </Button>
      </div>
    </div>
  )
}
