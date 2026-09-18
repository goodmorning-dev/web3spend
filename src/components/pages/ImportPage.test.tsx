import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import ImportPage from './ImportPage'

describe('ImportPage', () => {
  it('shows the import heading and the file picker', () => {
    render(<ImportPage />)
    expect(screen.getByRole('heading', { name: /import your etherfi export/i })).toBeInTheDocument()
    expect(screen.getByLabelText(/choose an xlsx file/i)).toBeInTheDocument()
  })
})
