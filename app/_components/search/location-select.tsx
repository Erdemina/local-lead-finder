'use client'

import { useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Check, ChevronsUpDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import { TR_PROVINCES } from '@/lib/discovery/tr-provinces'
import { districtsOf } from '@/lib/discovery/tr-districts'
import { TR } from '@/lib/i18n/tr'

const ANY_DISTRICT = '__all__'

/**
 * İl her zaman listeden seçilir — elle yazımda Türkçe karakter hataları
 * geocoding'i düşürüyordu. İlçe listesi olmayan illerde serbest metne düşer.
 */
export function LocationSelect({
  city,
  district,
  onCityChange,
  onDistrictChange,
}: {
  city: string
  district: string
  onCityChange: (v: string) => void
  onDistrictChange: (v: string) => void
}) {
  const [open, setOpen] = useState(false)
  const districts = useMemo(() => districtsOf(city), [city])

  return (
    <>
      <div className="space-y-2">
        <Label>{TR.searchPage.cityLabel}</Label>
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              role="combobox"
              aria-expanded={open}
              className="w-full justify-between font-normal"
            >
              {city || TR.searchPage.cityPlaceholder}
              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
            <Command>
              <CommandInput placeholder={TR.searchPage.citySearch} />
              <CommandList>
                <CommandEmpty>{TR.searchPage.cityNotFound}</CommandEmpty>
                <CommandGroup>
                  {TR_PROVINCES.map((p) => (
                    <CommandItem
                      key={p.code}
                      value={p.name}
                      onSelect={() => {
                        onCityChange(p.name)
                        onDistrictChange('')
                        setOpen(false)
                      }}
                    >
                      <Check
                        className={cn(
                          'mr-2 h-4 w-4',
                          city === p.name ? 'opacity-100' : 'opacity-0'
                        )}
                      />
                      {p.name}
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      </div>

      <div className="space-y-2">
        <Label>{TR.searchPage.districtLabel}</Label>
        {districts.length > 0 ? (
          <Select
            value={district || ANY_DISTRICT}
            onValueChange={(v) => onDistrictChange(v === ANY_DISTRICT ? '' : v)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ANY_DISTRICT}>{TR.searchPage.districtAll}</SelectItem>
              {districts.map((d) => (
                <SelectItem key={d} value={d}>
                  {d}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : (
          <Input
            value={district}
            onChange={(e) => onDistrictChange(e.target.value)}
            placeholder={TR.searchPage.districtFreeText}
          />
        )}
      </div>
    </>
  )
}
