"use client"

import * as React from "react"
import { Check, ChevronsUpDown, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

interface Option {
  value: string | number
  label: string
}

interface MultiComboboxProps {
  options: Option[]
  selectedValues: (string | number)[]
  onSelect: (values: (string | number)[]) => void
  placeholder?: string
  searchPlaceholder?: string
  emptyText?: string
  className?: string
}

export function MultiCombobox({
  options,
  selectedValues,
  onSelect,
  placeholder = "Select options...",
  searchPlaceholder = "Search options...",
  emptyText = "No options found.",
  className,
}: MultiComboboxProps) {
  const [open, setOpen] = React.useState(false)

  const selectedLabels = selectedValues
    .map(value => options.find(opt => opt.value === value)?.label)
    .filter(Boolean)

  const toggleOption = (value: string | number) => {
    if (selectedValues.includes(value)) {
      onSelect(selectedValues.filter(v => v !== value))
    } else {
      onSelect([...selectedValues, value])
    }
  }

  const removeValue = (valueToRemove: string | number) => {
    onSelect(selectedValues.filter(value => value !== valueToRemove))
  }

  return (
    <div className="flex flex-col gap-2">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className={cn("w-full justify-between", className)}
          >
            <span className="truncate">
              {selectedLabels.length > 0
                ? `${selectedLabels.length} selected`
                : placeholder}
            </span>
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-full p-0" align="start">
          <Command>
            <CommandInput placeholder={searchPlaceholder} />
            <CommandList>
              <CommandEmpty>{emptyText}</CommandEmpty>
              <CommandGroup>
                {options.map((option) => (
                  <CommandItem
                    key={option.value}
                    value={option.label}
                    onSelect={() => toggleOption(option.value)}
                  >
                    <div className="flex items-center gap-2">
                      <div
                        className={cn(
                          "flex h-4 w-4 items-center justify-center rounded-sm border border-primary",
                          selectedValues.includes(option.value)
                            ? "bg-primary text-primary-foreground"
                            : "opacity-50"
                        )}
                      >
                        <Check className={cn(
                          "h-3 w-3",
                          selectedValues.includes(option.value) ? "opacity-100" : "opacity-0"
                        )} />
                      </div>
                      {option.label}
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {selectedValues.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {selectedValues.map((value) => {
            const option = options.find(opt => opt.value === value)
            if (!option) return null
            
            return (
              <div
                key={value}
                className="flex items-center gap-1 rounded-md bg-secondary px-2 py-1 text-sm"
              >
                <span>{option.label}</span>
                <button
                  type="button"
                  onClick={() => removeValue(value)}
                  className="text-secondary-foreground/50 hover:text-secondary-foreground"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
} 