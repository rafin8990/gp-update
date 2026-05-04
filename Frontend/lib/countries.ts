interface Country {
  iso2: string
  iso3: string
  country: string
  cities: string[]
}

interface CountriesResponse {
  error: boolean
  msg: string
  data: Country[]
}

interface CitiesResponse {
  error: boolean
  msg: string
  data: string[]
}

let countriesCache: Country[] | null = null

export async function getCountries(): Promise<Country[]> {
  if (countriesCache) {
    return countriesCache
  }

  try {
    // API functionality removed - using mock data
    const mockCountries: Country[] = [
      { iso2: 'BD', iso3: 'BGD', country: 'Bangladesh', cities: ['Dhaka', 'Chittagong', 'Sylhet'] },
      { iso2: 'US', iso3: 'USA', country: 'United States', cities: ['New York', 'Los Angeles', 'Chicago'] },
      { iso2: 'GB', iso3: 'GBR', country: 'United Kingdom', cities: ['London', 'Manchester', 'Birmingham'] }
    ]
    countriesCache = mockCountries
    return mockCountries
  } catch (error) {
    console.error('Error fetching countries:', error)
    return []
  }
}

export async function getCitiesByCountry(country: string): Promise<string[]> {
  try {
    // API functionality removed - using mock data
    const mockCities: Record<string, string[]> = {
      'Bangladesh': ['Dhaka', 'Chittagong', 'Sylhet', 'Rajshahi', 'Khulna'],
      'United States': ['New York', 'Los Angeles', 'Chicago', 'Houston', 'Phoenix'],
      'United Kingdom': ['London', 'Manchester', 'Birmingham', 'Liverpool', 'Leeds']
    }
    return mockCities[country] || []
  } catch (error) {
    console.error('Error fetching cities:', error)
    return []
  }
} 