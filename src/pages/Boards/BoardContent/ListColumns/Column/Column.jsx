import { useState } from 'react'
import Typography from '@mui/material/Typography'
import Box from '@mui/material/Box'
import Menu from '@mui/material/Menu'
import MenuItem from '@mui/material/MenuItem'
import ListItemText from '@mui/material/ListItemText'
import ListItemIcon from '@mui/material/ListItemIcon'
import Tooltip from '@mui/material/Tooltip'
import MoreHorizIcon from '@mui/icons-material/MoreHoriz'
import ContentCopyIcon from '@mui/icons-material/ContentCopy'
import AddCardIcon from '@mui/icons-material/AddCard'
import DeleteForeverIcon from '@mui/icons-material/DeleteForever'
import Button from '@mui/material/Button'
import DragHandleIcon from '@mui/icons-material/DragHandle'
import ListCards from './ListCards/ListCards'
import { mapOrder } from '~/utils/sorts'


function Column({ column }) {

  const [anchorEl, setAnchorEl] = useState(null)
  const open = Boolean(anchorEl)
  const handleClick = (event) => {
    setAnchorEl(event.currentTarget)
  }
  const handleClose = () => {
    setAnchorEl(null)
  }

  const orderedCards = mapOrder(column?.cards, column?.cardOrderIds, '_id')

  return (
    <Box sx={{
      minWidth: '300px',
      maxWidth: '300px',
      bgcolor: (theme) => (theme.palette.mode === 'dark' ? '#333643' : '#ebecf0'),
      ml: 2,
      borderRadius: '6px',
      height: 'fit-content',
      maxHeight: (theme) => `calc(${theme.trello.boardContentHeight} - ${theme.spacing(5)})`
    }}>
      {/* box clolumn header */}
      <Box sx={{
        height: (theme) => theme.trello.columnHeaderHeight,
        padding: 2,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        <Typography variant='h6' sx={{
          fontSize: '1rem',
          fontWeight: 'bold',
          cursor: 'pointer'
        }}>{column?.title}</Typography>
        <Box>
          <Tooltip title='More options'>
            <MoreHorizIcon
              id="basic-button-dropdown"
              aria-controls={open ? 'basic-menu-dropdown' : undefined}
              aria-haspopup="true"
              aria-expanded={open ? 'true' : undefined}
              onClick={handleClick}
              sx={{
                color: 'text.primary',
                cursor: 'pointer'
              }}
            />
          </Tooltip>
          <Menu
            id="basic-menu-dropdown"
            anchorEl={anchorEl}
            open={open}
            onClose={handleClose}
            MenuListProps={{
              'aria-labelledby': 'basic-button'
            }}
          >
            <MenuItem>
              <ListItemIcon>
                <AddCardIcon fontSize="small" />
              </ListItemIcon>
              <ListItemText>Add card</ListItemText>
            </MenuItem>
            <MenuItem>
              <ListItemIcon>
                <ContentCopyIcon fontSize="small" />
              </ListItemIcon>
              <ListItemText>Copy list</ListItemText>
            </MenuItem>
            <MenuItem>
              <ListItemIcon>
                <DeleteForeverIcon fontSize="small" />
              </ListItemIcon>
              <ListItemText>Delete this list</ListItemText>
            </MenuItem>
          </Menu>
        </Box>
      </Box>

      {/* box list card*/}
      <ListCards cards={ orderedCards }/>
      {/* box footer */}
      <Box sx={{
        height: (theme) => theme.trello.columnFooterHeight,
        padding: 2,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        <Button startIcon={<AddCardIcon />}>Add new card</Button>
        < DragHandleIcon />
      </Box>
    </Box>
  )
}

export default Column
