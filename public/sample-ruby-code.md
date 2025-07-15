# File Summary

This is a sample Ruby code for demonstrating FlowCodeLinks features.
The code represents a simple e-commerce order processing system.

# Directory Structure
```
app/
  controllers/
    orders_controller.rb
  models/
    order.rb
    product.rb
  services/
    order_service.rb
```

## File: app/controllers/orders_controller.rb
```ruby
class OrdersController
  # 基底コントローラー機能（簡易実装）
  def self.before_action(method_name, options = {})
    # before_actionの簡易実装
  end
  
  before_action :set_order, only: [:show]

  def index
    @orders = Order.recent_orders
    prepare_orders_display(@orders)
  end

  def show
    @order_details = OrderService.new(@order).prepare_details
    calculate_order_stats
  end

  def create
    @order = Order.new(order_params)
    @order.user_id = get_current_user_id
    
    if OrderService.new(@order).process_order
      redirect_to @order, notice: '注文が完了しました'
    else
      render :new
    end
  end

  private

  def set_order
    @order = Order.find_by_user(get_current_user_id, params[:id])
  end

  def get_current_user_id
    # セッションやトークンから現在のユーザーIDを取得
    session[:user_id] || 1 # デフォルトユーザー
  end
  
  def redirect_to(path, options = {})
    # リダイレクト処理のシミュレーション
    puts "Redirecting to: #{path} with notice: #{options[:notice]}"
  end
  
  def render(template)
    # レンダリング処理のシミュレーション
    puts "Rendering template: #{template}"
  end
  
  def params
    # パラメータのシミュレーション
    @params ||= {
      id: "1",
      order: { product_id: 1, quantity: 2 }
    }
  end
  
  def session
    # セッションのシミュレーション
    @session ||= { user_id: 1 }
  end

  def order_params
    # パラメータ取得のシミュレーション
    params[:order] || { product_id: 1, quantity: 2 }
  end

  def prepare_orders_display(orders)
    orders.each do |order|
      order.calculate_total_price
    end
  end

  def calculate_order_stats
    @total_amount = @order.calculate_total_price
    @tax_amount = @order.calculate_tax
  end
end
```

## File: app/models/order.rb
```ruby
class Order
  # 基底モデル機能（簡易実装）
  def self.validates(field, options = {})
    # バリデーションの簡易実装
  end
  attr_accessor :user_id, :product_id, :quantity, :created_at
  
  validates :quantity, presence: true, numericality: { greater_than: 0 }
  
  def valid?
    # 簡易バリデーション処理
    return false unless quantity
    return false if quantity <= 0
    true
  end
  
  def self.recent_orders
    # 最新の注文を取得するロジック
    orders = [
      new(user_id: 1, product_id: 1, quantity: 2),
      new(user_id: 1, product_id: 2, quantity: 1),
      new(user_id: 1, product_id: 3, quantity: 5)
    ]
    orders.sort_by { |order| order.created_at || Time.now }.reverse.first(10)
  end
  
  def self.find_by_user(user_id, order_id)
    # ユーザーIDと注文IDで注文を検索
    new(user_id: user_id, product_id: order_id.to_i, quantity: 3)
  end
  
  def product
    @product ||= Product.find(product_id)
  end
  
  def calculate_total_price
    return 0 unless product && quantity
    
    base_price = product.price * quantity
    apply_discount(base_price)
  end
  
  def calculate_tax
    total = calculate_total_price
    total * tax_rate
  end
  
  def apply_discount(price)
    if quantity >= 10
      price * 0.9
    else
      price
    end
  end
  
  private
  
  def tax_rate
    0.1
  end
end
```

## File: app/models/product.rb
```ruby
class Product
  # 基底モデル機能（簡易実装）
  def self.validates(field, options = {})
    # バリデーションの簡易実装
  end
  attr_accessor :id, :name, :price, :stock_quantity
  
  validates :name, presence: true
  validates :price, presence: true, numericality: { greater_than: 0 }
  
  def initialize(id: nil, name: nil, price: nil, stock_quantity: 100)
    @id = id
    @name = name
    @price = price
    @stock_quantity = stock_quantity
  end
  
  def self.find(id)
    # サンプル商品データ
    products = {
      1 => new(id: 1, name: 'Rubyプログラミング本', price: 3000, stock_quantity: 50),
      2 => new(id: 2, name: 'Railsガイドブック', price: 4500, stock_quantity: 30),
      3 => new(id: 3, name: 'Web開発ツール', price: 2000, stock_quantity: 80)
    }
    products[id.to_i] || new(id: id, name: '未知の商品', price: 1000)
  end
  
  def in_stock?
    stock_quantity > 0
  end
  
  def reduce_stock(quantity)
    return false unless in_stock?
    return false if stock_quantity < quantity
    
    @stock_quantity -= quantity
    true
  end
  
  def display_price
    "¥#{price.to_s.reverse.gsub(/(\d{3})(?=\d)/, '\\1,').reverse}"
  end
end
```

## File: app/services/order_service.rb
```ruby
class OrderService
  def initialize(order)
    @order = order
  end
  
  def process_order
    return false unless validate_order
    
    # トランザクション処理のシミュレーション
    begin
      save_order
      reduce_product_stock
      send_order_confirmation
      true
    rescue StandardError => e
      puts "Order processing failed: #{e.message}"
      false
    end
  end
  
  def prepare_details
    {
      order: @order,
      total_price: @order.calculate_total_price,
      tax: @order.calculate_tax,
      product_info: prepare_product_info
    }
  end
  
  private
  
  def validate_order
    return false unless @order.valid?
    return false unless @order.product.in_stock?
    
    true
  end
  
  def reduce_product_stock
    @order.product.reduce_stock(@order.quantity)
  end
  
  def save_order
    # 注文データの保存処理（シミュレーション）
    @order.instance_variable_set(:@saved, true)
    @order.instance_variable_set(:@id, generate_order_id)
  end
  
  def generate_order_id
    # 簡易的なID生成（実際はDBのauto_incrementを使用）
    Time.now.to_i + rand(1000)
  end
  
  def send_order_confirmation
    # メール送信処理（今回は省略）
    puts "Order confirmation sent for Order ##{@order.id || 'NEW'}"
  end
  
  def prepare_product_info
    {
      name: @order.product.name,
      price: @order.product.display_price,
      quantity: @order.quantity
    }
  end
end
```