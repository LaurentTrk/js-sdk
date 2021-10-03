yarn build && yarn next export

# We need to rename _next folder as Chrome extension does not support it
mv out/_next out/assets && find out -type f -name "*.js" -exec sed -i 's/\/_next/\/assets/g' {} + && sed -i 's/\/_next/\/assets/g' out/**.html