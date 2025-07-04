import { render, screen, waitFor } from '@testing-library/react'
import Home from '@/app/page'

describe('Home Page', () => {
  it('should render the page title', async () => {
    render(<Home />)
    
    // 非同期的にh1要素が表示されるまで待つ
    const heading = await waitFor(() => 
      screen.getByRole('heading', {
        name: /code visualizer/i,
      }),
      { timeout: 3000 }
    )
    
    expect(heading).toBeInTheDocument()
  })
  
  it('should render the upload interface', async () => {
    render(<Home />)
    
    // 非同期的に要素が表示されるまで待つ
    const uploadText = await waitFor(() => 
      screen.getByText(/Repomixで生成されたmdファイルをアップロード/i),
      { timeout: 3000 }
    )
    const uploadButton = await waitFor(() =>
      screen.getByText('mdファイルを選択'),
      { timeout: 3000 }
    )
    
    expect(uploadText).toBeInTheDocument()
    expect(uploadButton).toBeInTheDocument()
  })
})