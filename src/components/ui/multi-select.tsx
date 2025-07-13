import * as React from "react"
import { X } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"

interface MultiSelectProps {
  options?: { value: string; label: string }[]
  selected: string[]
  onChange: (selected: string[]) => void
  placeholder?: string
  className?: string
}

export function MultiSelect({
  selected,
  onChange,
  placeholder = "Enter Resource IDs (comma-separated)...",
  className,
}: MultiSelectProps) {
  const [inputValue, setInputValue] = React.useState("")

  const handleInputChange = (value: string) => {
    setInputValue(value)
    // Parse comma-separated values
    const resourceIds = value
      .split(",")
      .map(id => id.trim())
      .filter(id => id.length > 0)
    onChange(resourceIds)
  }

  const handleUnselect = (item: string) => {
    const newSelected = selected.filter((i) => i !== item)
    onChange(newSelected)
    setInputValue(newSelected.join(", "))
  }

  return (
    <div className={`space-y-2 ${className}`}>
      <Input
        placeholder={placeholder}
        value={inputValue}
        onChange={(e) => handleInputChange(e.target.value)}
        className="w-full"
      />
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {selected.map((item) => (
            <Badge key={`selected-${item}`} variant="secondary" className="rounded-sm px-1 font-normal">
              {item}
              <button
                className="ml-1 ring-offset-background rounded-full outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    handleUnselect(item)
                  }
                }}
                onMouseDown={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                }}
                onClick={() => handleUnselect(item)}
              >
                <X className="h-3 w-3 text-muted-foreground hover:text-foreground" />
              </button>
            </Badge>
          ))}
        </div>
      )}
    </div>
  )
} 