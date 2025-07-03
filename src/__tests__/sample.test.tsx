import { render, screen } from '@testing-library/react'
import Home from '@/app/page'

describe('Home Page', () => {
  it('should render the page title', () => {
    render(<Home />)
    
    const heading = screen.getByRole('heading', {
      name: /code visualizer/i,
    })
    
    expect(heading).toBeInTheDocument()
  })
  
  it('should render the upload interface', () => {
    render(<Home />)
    
    const uploadText = screen.getByText(/Repomixで生成されたmdファイルをアップロード/i)
    const uploadButton = screen.getByText('mdファイルを選択')
    
    expect(uploadText).toBeInTheDocument()
    expect(uploadButton).toBeInTheDocument()
  })
})