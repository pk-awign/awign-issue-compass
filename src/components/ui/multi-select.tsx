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
  options,
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

  const toggleOption = (value: string) => {
    if (selected.includes(value)) {
      onChange(selected.filter(v => v !== value))
    } else {
      onChange([...selected, value])
    }
  }

  return (
    <div className={`space-y-2 ${className}`}>
      {options && options.length > 0 ? (
        <div className="space-y-2">
          {selected.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {selected.map((item) => {
                const label = options.find(o => o.value === item)?.label || item
                return (
                  <Badge key={`selected-${item}`} variant="secondary" className="rounded-sm px-1 font-normal">
                    {label}
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
                )
              })}
            </div>
          )}
          <div className="flex flex-wrap gap-2">
            {options.map(opt => {
              const isSelected = selected.includes(opt.value)
              return (
                <button
                  key={opt.value}
                  type="button"
                  className={`text-xs px-2 py-1 rounded border ${isSelected ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-700 border-gray-300'}`}
                  onClick={() => toggleOption(opt.value)}
                >
                  {opt.label}
                </button>
              )
            })}
          </div>
        </div>
      ) : (
        <>
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
        </>
      )}
    </div>
  )
} 