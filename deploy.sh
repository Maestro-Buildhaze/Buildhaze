#!/bin/bash
echo "🚀 Buildhaze Auto Deploy Script"
echo "================================"

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

cd /Users/emirg/CascadeProjects/cms-platform

# Step 1: Git status
echo -e "${YELLOW}📋 Checking git status...${NC}"
git status --short

# Step 2: Add all
echo -e "${YELLOW}➕ Adding all changes...${NC}"
git add .

# Step 3: Commit
echo -e "${YELLOW}💾 Committing...${NC}"
git commit -m "feat: Admin ClientDetails with shadow access, CMS Dashboard with full editing, Media upload, new API endpoints"

# Step 4: Push
echo -e "${YELLOW}📤 Pushing to GitHub...${NC}"
git push origin main

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Push successful!${NC}"
    
    # Step 5: Trigger Render Backend Deploy
    echo -e "${YELLOW}🔄 Triggering Render Backend deploy...${NC}"
    curl -s -X POST "https://api.render.com/deploy/srv-d893ln6k1jcs7382vf70?key=VqJUgJcNvgM"
    echo -e "${GREEN}✅ Backend deploy triggered${NC}"
    
    # Step 6: Trigger Render UI Deploy  
    echo -e "${YELLOW}🔄 Triggering Render UI deploy...${NC}"
    curl -s -X POST "https://api.render.com/deploy/srv-d89giqel51nc738e1m2g?key=wuoFs3HFVEY"
    echo -e "${GREEN}✅ UI deploy triggered${NC}"
    
    echo ""
    echo -e "${GREEN}🎉 ALL DONE! Check your dashboards:${NC}"
    echo "   - Render Backend: https://dashboard.render.com"
    echo "   - Netlify: https://app.netlify.com (auto-deploy on push)"
    
else
    echo -e "${RED}❌ Push failed!${NC}"
    exit 1
fi
